import { getInput, setFailed } from '@actions/core';
import { context, GitHub } from '@actions/github';

async function sh(cmd) {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

const getPullRequestNumber = () => {
  const pullRequest = context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
};

const getPullRequestChangedFiles = async (octokit) => {
  const { data } = await octokit.pulls.listFiles({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: getPullRequestNumber(),
  });

  let filesChanged = data.map((v) => v.filename);
  const fileTypesToExclude = core.getInput('exclude-types');
  const filePathsToExclude = core.getInput('excludes')

  if (fileTypesToExclude != null && fileTypesToExclude.length != 0) {
    fileTypesToExclude.forEach(type =>
      filesChanged = filesChanged.filter(file => file.endsWith(type))
    );
  }

  if (filePathsToExclude != null && filePathsToExclude.length != 0) {
    filePathsToExclude.forEach(path =>
      filesChanged = filesChanged.filter(file => file.startsWith(path))
    );
  }

  return filesChanged
};

async function sh(cmd) {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

const token = core.getInput('github-token');
const octokit = new GitHub(token);

const filesChanged = await getPullRequestChangedFiles(octokit);
let output = ''
filesChanged.forEach(file => output.concat(await sh(`swift-format lint ${file}`)));

if (!output.isEmpty()) {
  core.setFailed('swift-format found linter errors');
}