# Manual Windows regression: only isolated test servers are terminated.
$ErrorActionPreference = 'Stop'
$workspacePath = Split-Path $PSScriptRoot -Parent
$nodeExecutable = (Get-Command node.exe -CommandType Application | Select-Object -First 1).Source
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class LaunchLifetime {
 [StructLayout(LayoutKind.Sequential)] public struct BasicLimits {
  public long PerProcessTime, PerJobTime; public uint LimitFlags;
  public UIntPtr MinWorkingSet, MaxWorkingSet; public uint ActiveProcesses;
  public UIntPtr Affinity; public uint PriorityClass, SchedulingClass;
 }
 [StructLayout(LayoutKind.Sequential)] public struct IoCounters { public ulong ReadOps,WriteOps,OtherOps,ReadBytes,WriteBytes,OtherBytes; }
 [StructLayout(LayoutKind.Sequential)] public struct ExtendedLimits {
  public BasicLimits Basic; public IoCounters Io; public UIntPtr ProcessMemory,JobMemory,PeakProcessMemory,PeakJobMemory;
 }
 [StructLayout(LayoutKind.Sequential)] public struct Startup {
  public int cb; public IntPtr reserved,desktop,title;
  public uint x,y,width,height,charsX,charsY,fill,flags; public ushort show,reservedSize;
  public IntPtr reservedPointer,input,output,error;
 }
 [StructLayout(LayoutKind.Sequential)] public struct ProcessInfo { public IntPtr process,thread; public uint processId,threadId; }
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern IntPtr CreateJobObject(IntPtr attributes,string name);
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool SetInformationJobObject(IntPtr job,int kind,IntPtr data,uint size);
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool CreateProcess(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref Startup startup,out ProcessInfo result);
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool IsProcessInJob(IntPtr process,IntPtr job,out bool inside);
 [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint rights,bool inherit,uint pid);
 [DllImport("kernel32.dll", SetLastError=true)] public static extern uint ResumeThread(IntPtr thread);
 [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr handle);
}
'@

function Check($condition,$message) { if (-not $condition) { throw ($message + ' Win32=' + [Runtime.InteropServices.Marshal]::GetLastWin32Error()) } }
function Is-Ready($base) { try { return (Invoke-RestMethod -Uri ($base + '/api/status') -TimeoutSec 1).name -eq 'MusicFrame Render' } catch { return $false } }

$results = @()
foreach ($mode in @('legacy','independent')) {
    $portNumber = if ($mode -eq 'legacy') { 5197 } else { 5198 }
    $baseUrl = 'http://127.0.0.1:' + $portNumber
    Check (-not (Is-Ready $baseUrl)) 'Test port occupied.'
    $tempPath = Join-Path ([IO.Path]::GetTempPath()) ('musicframe-job-proof-' + [guid]::NewGuid())
    New-Item -ItemType Directory -Path $tempPath | Out-Null
    $helperPath = Join-Path $tempPath 'parent.mjs'
    $helper = @'
import {spawn,execFile} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import {promisify} from 'node:util';
import path from 'node:path';
const [mode,root]=process.argv.slice(2);
try{
 if(mode==='legacy'){
  const child=spawn(process.execPath,[path.join(root,'server/index.js')],{cwd:root,windowsHide:true,detached:true,stdio:'ignore'});
  child.unref();await writeFile(path.join(process.env.DATA_DIR,'child.pid'),String(child.pid));
 }else{
  await promisify(execFile)(process.execPath,[path.join(root,'scripts/start-service.js')],{cwd:root,windowsHide:true});
  await writeFile(path.join(process.env.DATA_DIR,'child.pid'),await readFile(path.join(process.env.DATA_DIR,'logs/server.pid')));
 }
 setInterval(()=>{},1000);
}catch(error){await writeFile(path.join(process.env.DATA_DIR,'error.txt'),error.stack);process.exitCode=1;}
'@
    [IO.File]::WriteAllText($helperPath,$helper,[Text.UTF8Encoding]::new($false))
    $jobHandle = [LaunchLifetime]::CreateJobObject([IntPtr]::Zero,$null)
    Check ($jobHandle -ne [IntPtr]::Zero) 'CreateJobObject failed.'
    $info = [LaunchLifetime+ProcessInfo]::new()
    $childProcessId = $null
    $previousPort,$previousHost,$previousData = $env:PORT,$env:HOST,$env:DATA_DIR
    try {
        $limit = [LaunchLifetime+ExtendedLimits]::new()
        $basic = [LaunchLifetime+BasicLimits]::new()
        $basic.LimitFlags = 0x2000 # KILL_ON_JOB_CLOSE
        $limit.Basic = $basic
        Check ($limit.Basic.LimitFlags -eq 0x2000) 'Kill-on-close flag not set.'
        $size = [Runtime.InteropServices.Marshal]::SizeOf($limit)
        $pointer = [Runtime.InteropServices.Marshal]::AllocHGlobal($size)
        try {
            [Runtime.InteropServices.Marshal]::StructureToPtr($limit,$pointer,$false)
            Check ([LaunchLifetime]::SetInformationJobObject($jobHandle,9,$pointer,$size)) 'SetInformationJobObject failed.'
        } finally { [Runtime.InteropServices.Marshal]::FreeHGlobal($pointer) }
        $startup = [LaunchLifetime+Startup]::new()
        $startup.cb = [Runtime.InteropServices.Marshal]::SizeOf($startup)
        $command = [Text.StringBuilder]::new(('"{0}" "{1}" {2} "{3}"' -f $nodeExecutable,$helperPath,$mode,$workspacePath))
        $env:PORT = [string]$portNumber; $env:HOST = '127.0.0.1'; $env:DATA_DIR = $tempPath
        Check ([LaunchLifetime]::CreateProcess($nodeExecutable,$command,[IntPtr]::Zero,[IntPtr]::Zero,$false,0x08000004,[IntPtr]::Zero,$workspacePath,[ref]$startup,[ref]$info)) 'CreateProcess failed.'
        Check ([LaunchLifetime]::AssignProcessToJobObject($jobHandle,$info.process)) 'AssignProcessToJobObject failed.'
        Check ([LaunchLifetime]::ResumeThread($info.thread) -ne [uint32]::MaxValue) 'ResumeThread failed.'
        for ($attempt=0;$attempt -lt 80;$attempt++) {
            if ((Is-Ready $baseUrl) -and (Test-Path -LiteralPath (Join-Path $tempPath 'child.pid'))) { break }
            if (Test-Path -LiteralPath (Join-Path $tempPath 'error.txt')) { throw (Get-Content -LiteralPath (Join-Path $tempPath 'error.txt') -Raw) }
            Start-Sleep -Milliseconds 200
        }
        Check (Is-Ready $baseUrl) 'Test server did not start.'
        $childProcessId = [uint32](Get-Content -LiteralPath (Join-Path $tempPath 'child.pid') -Raw).Trim()
        $childHandle = [LaunchLifetime]::OpenProcess(0x1000,$false,$childProcessId)
        Check ($childHandle -ne [IntPtr]::Zero) 'Cannot inspect test child.'
        try {
            $inLauncherJob=$false
            Check ([LaunchLifetime]::IsProcessInJob($childHandle,$jobHandle,[ref]$inLauncherJob)) 'Cannot inspect Job membership.'
        } finally { [LaunchLifetime]::CloseHandle($childHandle) | Out-Null }
        [LaunchLifetime]::CloseHandle($jobHandle) | Out-Null
        $jobHandle=[IntPtr]::Zero
        Start-Sleep -Milliseconds 600
        $survived = Is-Ready $baseUrl
        [pscustomobject]@{mode=$mode;inLauncherJob=$inLauncherJob;survivesParentJobTermination=$survived} | ConvertTo-Json -Compress | Write-Host
        Check ($survived -eq ($mode -eq 'independent')) 'Unexpected lifetime after closing parent Job.'
        Check ($inLauncherJob -eq ($mode -eq 'legacy')) 'Unexpected parent Job membership.'
        $results += [pscustomobject]@{mode=$mode;inLauncherJob=$inLauncherJob;survivesParentJobTermination=$survived;port=$portNumber;childPid=$childProcessId}
    } finally {
        $env:PORT=$previousPort; $env:HOST=$previousHost; $env:DATA_DIR=$previousData
        if ($jobHandle -ne [IntPtr]::Zero) { [LaunchLifetime]::CloseHandle($jobHandle) | Out-Null }
        if ($info.thread -ne [IntPtr]::Zero) { [LaunchLifetime]::CloseHandle($info.thread) | Out-Null }
        if ($info.process -ne [IntPtr]::Zero) { [LaunchLifetime]::CloseHandle($info.process) | Out-Null }
        if ($null -ne $childProcessId) { Stop-Process -Id $childProcessId -ErrorAction SilentlyContinue }
    }
}
$report = [pscustomobject]@{time=(Get-Date -Format o);results=$results}
$report | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $workspacePath 'data\logs\launch-lifetime-verification.json') -Encoding utf8
$report | ConvertTo-Json -Depth 4
