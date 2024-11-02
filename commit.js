const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoPath = "./"; // Update this to your repo path
const maxDaysAgo = 286; // Max days ago to start committing
const maxCommitsPerDay = 4; // Max commits per day
const totalCommitsLimit = 50; // Limit for total commits to create

function removeLockFile() {
  const lockFilePath = path.join(repoPath, ".git", "index.lock");
  if (fs.existsSync(lockFilePath)) {
    try {
      fs.unlinkSync(lockFilePath);
      console.log("Removed index.lock file.");
    } catch (err) {
      console.error("Failed to remove index.lock file:", err);
    }
  }
}

function checkLockFileAndExecute(command, callback) {
  const lockFilePath = path.join(repoPath, ".git", "index.lock");

  const checkAndExecute = (attempts = 0) => {
    if (fs.existsSync(lockFilePath)) {
      if (attempts < 5) {
        console.log("Git index.lock file exists, retrying...");
        setTimeout(() => checkAndExecute(attempts + 1), 1000);
      } else {
        callback(
          new Error("Git index.lock file exists after multiple retries.")
        );
      }
    } else {
      exec(command, (err) => {
        if (err) return callback(err);
        callback(null);
      });
    }
  };

  checkAndExecute();
}

function generateRandomContent() {
  const phrases = [
    "This is some random content.",
    "Just adding a file for testing.",
    "Here's another dummy file!",
    "Random content generated for commit.",
    "Testing out different messages.",
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function createCommit(date, index) {
  return new Promise((resolve, reject) => {
    removeLockFile();

    const filePath = path.join(repoPath, `dummy-file-${date}-${index}.txt`);
    const content = generateRandomContent();

    fs.writeFile(filePath, content, (err) => {
      if (err) return reject(err);
      checkLockFileAndExecute(`git -C "${repoPath}" add .`, (err) => {
        if (err) return reject(err);
        const commitMessage = `Random commit ${index} on ${date}`;
        checkLockFileAndExecute(
          `git -C "${repoPath}" commit --date="${date}" -m "${commitMessage}"`,
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
    });
  });
}

async function main() {
  const today = new Date();
  const commitPromises = [];
  let totalCommits = 0;

  for (let day = 0; day <= maxDaysAgo; day++) {
    const commitCount = Math.floor(Math.random() * maxCommitsPerDay);
    const commitDate = new Date(today);
    commitDate.setDate(today.getDate() - day);
    const formattedDate = commitDate.toISOString().split("T")[0];

    for (let i = 1; i <= commitCount; i++) {
      if (totalCommits >= totalCommitsLimit) {
        console.log("Reached the total commits limit.");
        break;
      }
      commitPromises.push(createCommit(formattedDate, ++totalCommits));
      console.log(
        `Preparing to commit dummy-file-${formattedDate}-${totalCommits}.txt on ${formattedDate}`
      );
    }
    if (totalCommits >= totalCommitsLimit) break;
  }

  try {
    await Promise.all(commitPromises);
    console.log("All commits created successfully!");
  } catch (error) {
    console.error("Error creating commits:", error);
  }
}

main();
