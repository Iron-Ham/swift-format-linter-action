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

  return filesChanged.filter(file => file.endsWith('.swift'));
};

async function format(file) {
  const { spawn } = require('child_process');
  return new Promise(function (resolve, reject) {
    var issues = 0;
    const lint = spawn("swift", ["format", "lint", file]);
    lint.stderr.on('data', (data) => {
      data.toString()
	  .split('\n')
	  .forEach(issue => {
	    const ISSUE_REGEX = /^(.*):([0-9]+):([0-9]+): (warning|error): (.*)$/g;
	    for (let report of issue.matchAll(ISSUE_REGEX)) {
	      const [_, path, line, column, level, message, index, input, groups] = report;
	      console.log(`::${level.trim()} file=${path.trim()},line=${line.trim()},col=${column.trim()}::${message.trim()}`);
	      issues += 1;
	    }
	  });
    });
    // Unfortunately, `swift-format` does not provide an exit code to indicate
    // if there were issues detected or not.  We instead count the number of
    // reported lint warnings and use that to determine whether the promise
    // should be fulfilled or cancelled.
    lint.on('exit', (code) => {
      if (issues === 0) {
	resolve();
      } else {
	reject(`${issues} issues detected in ${file}`);
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
