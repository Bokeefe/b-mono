import fs from 'fs';
import path from 'path';

function getAudioFiles(directoryPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        return reject(err);
      }
      resolve(
        files
          .filter(file => file.endsWith('.mp3'))
          .map(file => ({
            title: file,
            src: path.join(directoryPath, file),
          }))
      );
    });
  });
}

export default getAudioFiles;