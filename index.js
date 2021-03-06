const core = require('@actions/core');
const github = require('@actions/github');

const getPullRequestNumber = () => {
  const fs = require('fs');
  const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'));
  return ev.number;
}

const getPullRequestChangedFiles = async (octokit) => {
  const nwo = process.env['GITHUB_REPOSITORY'] || '/';
  const [owner, repo] = nwo.split('/');
  const { data } = await octokit.pulls.listFiles({
    owner: owner,
    repo: repo,
    pull_number: getPullRequestNumber(),
  });

  let filesChanged = data.map((v) => v.filename);
  const fileTypeJsonString = core.getInput('exclude-types');
  const pathJsonString = core.getInput('excludes');

  const fileTypesToExclude = !fileTypeJsonString || fileTypeJsonString.trim() == '' ? null : JSON.parse(fileTypeJsonString);
  const filePathsToExclude = !pathJsonString || pathJsonString.trim() == '' ? null : JSON.parse(pathJsonString);

  if (fileTypesToExclude != null && fileTypesToExclude.length != 0) {
    fileTypesToExclude.forEach(type =>
      filesChanged = filesChanged.filter(file => !file.endsWith(type))
    );
  }

  if (filePathsToExclude != null && filePathsToExclude.length != 0) {
    filePathsToExclude.forEach(path =>
      filesChanged = filesChanged.filter(file => !file.startsWith(path))
    );
  }

  filesChanged.map(filename => filename.replace(/\s/g, '\\ '));
  return filesChanged.filter(file => file.endsWith('.swift'));
};

async function format(file) {
  const { exec } = require('child_process');
  return new Promise(function (resolve, reject) {
    exec(`swift-format lint ${file}`, (err, stdout, stderr) => {
      if (err) {
        err.message
          .split('\n')
          .slice(1)
          .forEach(issue => {
            let splitIssue = issue.split(':')
            if (splitIssue.length != 6) return;
            console.log(`::${splitIssue[3].trim()} file=${splitIssue[0].trim()},line=${splitIssue[1]},col=${splitIssue[2]}::${splitIssue[4].trim()}${splitIssue[5].trim()}`)
          })
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function runSwiftFormat(octokit) {
  const filesChanged = await getPullRequestChangedFiles(octokit);
  if (filesChanged.length == 0) return [Promise.resolve()];
  return filesChanged.map(file => format(file));
}

async function main() {
  const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
  const octokit = new github.GitHub(token);
  Promise.all(await runSwiftFormat(octokit)).then(() => {
    console.log('done');
  }).catch((err) => {
    console.log(err);
    core.setFailed('swift-format failed check');
  })
}

main()