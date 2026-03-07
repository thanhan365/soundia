const { spawnSync } = require('child_process');
const fs = require('fs');

try {
  const result1 = spawnSync('git', ['show', '4c1c183:src/context/PlayerContext.jsx'], { cwd: 'd:/WORKSPACE/soundia', maxBuffer: 10 * 1024 * 1024 });
  if (result1.status === 0) {
    fs.writeFileSync('d:/WORKSPACE/soundia/4c1c183_PlayerContext.jsx', result1.stdout);
    console.log('Saved 4c1c183_PlayerContext.jsx');
  } else {
    console.error('Error 1:', result1.stderr.toString());
  }

  const result2 = spawnSync('git', ['show', '7ddb534:src/context/PlayerContext.jsx'], { cwd: 'd:/WORKSPACE/soundia', maxBuffer: 10 * 1024 * 1024 });
  if (result2.status === 0) {
    fs.writeFileSync('d:/WORKSPACE/soundia/7ddb534_PlayerContext.jsx', result2.stdout);
    console.log('Saved 7ddb534_PlayerContext.jsx');
  } else {
    console.error('Error 2:', result2.stderr.toString());
  }

} catch (e) {
  console.error('Exception:', e.message);
}
