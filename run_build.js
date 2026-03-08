const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('dotnet build backend.csproj', { 
      cwd: 'D:\\WORKSPACE\\soundia\\backend', 
      encoding: 'utf-8' 
  });
  fs.writeFileSync('D:\\WORKSPACE\\soundia\\build_result.txt', "SUCCESS\n" + output);
} catch (error) {
  fs.writeFileSync('D:\\WORKSPACE\\soundia\\build_result.txt', "ERROR\n" + error.stdout + "\n" + error.stderr);
}
