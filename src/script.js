const commitGraph = document.getElementById("commitGraph");
const usernameInput = document.getElementById("username");
const repoInput = document.getElementById("repo");
const tokenInput = document.getElementById("token");
const saveCommitsButton = document.getElementById("saveCommits");

const daysInWeek = 7;
const totalWeeks = 52;
const commitData = Array.from({ length: totalWeeks * daysInWeek }, () => 0);

let dragging = false;

function createCommitGraph() {
  commitGraph.innerHTML = "";
  commitData.forEach((commits, index) => {
    const square = document.createElement("div");
    square.className = "square";
    square.style.backgroundColor = getColor(commits);
    square.dataset.index = index;

    square.addEventListener("mousedown", () => {
      dragging = true;
      toggleCommit(square, index);
    });

    square.addEventListener("mouseenter", () => {
      if (dragging) {
        toggleCommit(square, index);
      }
    });

    square.addEventListener("mouseup", () => {
      dragging = false;
    });

    commitGraph.appendChild(square);
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}

function toggleCommit(square, index) {
  commitData[index]++;
  square.style.backgroundColor = getColor(commitData[index]);
}

function getColor(commitCount) {
  if (commitCount === 0) return "#ebedf0";
  if (commitCount === 1) return "#c6e48b"; // Light green
  if (commitCount === 2) return "#7bc96f"; // Medium green
  if (commitCount === 3) return "#239a3b"; // Dark green
  return "#196127"; // Darker green
}

saveCommitsButton.addEventListener("click", async () => {
  const username = usernameInput.value;
  const repo = repoInput.value;
  const token = tokenInput.value;

  for (let i = 0; i < commitData.length; i++) {
    const commits = commitData[i];
    if (commits > 0) {
      const date = getDateForSquare(i);
      await createCommit(username, repo, token, date, commits);
    }
  }
  alert("Commits saved to GitHub!");
});

async function createCommit(username, repo, token, date, commits) {
  const url = `https://api.github.com/repos/${username}/${repo}/git/refs/heads/main`;

  // Step 1: Get the latest commit
  const refResponse = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    },
  });

  const refData = await refResponse.json();
  const latestCommitSha = refData.object.sha;

  // Step 2: Create a new tree based on the latest commit
  const treeResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/git/trees/${latestCommitSha}`,
    {
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const treeData = await treeResponse.json();
  const newTreeResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/git/trees`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base_tree: treeData.sha,
        tree: [
          {
            path: `commit-log-${date}.txt`,
            mode: "100644",
            type: "blob",
            content: `Commit on ${date}: ${commits} commits`,
          },
        ],
      }),
    }
  );

  const newTreeData = await newTreeResponse.json();

  // Step 3: Create a new commit
  const newCommitResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/git/commits`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Commit on ${date}: ${commits} commits`,
        tree: newTreeData.sha,
        parents: [latestCommitSha],
      }),
    }
  );

  if (!newCommitResponse.ok) {
    const errorText = await newCommitResponse.text();
    console.error("Error creating commit:", errorText);
  }
}

function getDateForSquare(index) {
  const today = new Date();
  today.setDate(today.getDate() - index);
  return today.toISOString().split("T")[0]; // YYYY-MM-DD
}

// Initialize the graph on load
createCommitGraph();
