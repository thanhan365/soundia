const { execSync } = require('child_process');
try {
  execSync('git checkout HEAD -- src/context/PlayerContext.jsx src/components/YouTubeAudioPlayer.jsx src/components/ProgressBar.jsx src/components/RangeSlider.jsx', { stdio: 'inherit' });
  console.log('Successfully checked out files from HEAD');
} catch (e) {
  console.error('Error:', e.message);
}
