import path from 'node:path';
// Media copies belong to the project folder. Resolve them from the current data
// directory so moving/renaming the application never strands an old absolute path.
export function projectAudioPath(project,directory){
 const extension=path.extname(project.audioPath||'').toLowerCase();
 if(!['.mp3','.wav'].includes(extension))throw Error('Chemin audio de projet invalide.');
 return path.join(directory,'audio'+extension);
}
