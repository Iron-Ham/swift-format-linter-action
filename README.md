# swift-format-linter-action

## What does this do?

This action allows you to run Apple's [`swift-format`](https://github.com/apple/swift-format) as a lint command to verify that code being checked in follows the guidelines you or your team have set. 

## Run requirements

This action requires you to install the correct version of `swift-format`. At present, you can only do that from source. If using an OSX runner, the version on Homebrew is likely not going to work because of the Swift toolchain version. 

This action requires you to pass your `GITHUB_TOKEN` secret in order to function. This is in order to fetch the pull request with the relevant diff. 

This action requires to be ran on `pull_request`. It does not work with `push`. While there is an API to get pull requests associated with a commit SHA, that api can return multiple results in the case of dependent PR chains and can lead to false positive results without more investment into resolving the correct branch on my end. 

### Optional Parameters

This action has two optional parameters:
- `excludes`: This takes file paths or directory paths in the form of a JSON array string. This action will use these paths to find files whose paths start with the provided string and exclude them from being analyzed by `swift-format`.
- `exclude-types`: This takes file extensions in the form of a JSON array string. The action will use these extensions to find files whose paths end with the provided string and exclude them from being analyzed by `swift-format`.

## Sample workflow

This workflow provides an example of caching, building, and linting.
Note that if you are using Swift 5.1 or a future version of Swift you will have to update the brach path from which to install `swift-format`.

```yml
on: [pull_request]

jobs:
  swift-format-lint:
    runs-on: ubuntu-latest
    name: Swift-Format
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Restore swift build cache
        uses: actions/cache@v1
        with:
          path: .build
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
          restore-keys: |
            ${{ runner.os }}-spm-

      - name: swift build
        run: |
          if [ -d ".build" ]; then
            echo 'using cache'
          else
            git clone -b swift-5.2-branch https://github.com/apple/swift-format.git
            cd swift-format
            swift build --disable-sandbox -c release
            mv .build .. && cd ..
            sudo cp -f .build/release/swift-format /usr/local/bin/swift-format
          fi

      - name: Lint
        uses: Iron-Ham/swift-format-linter-action@v3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          # Optional parameters. Note that these are formatted as JSON array strings
          # excludes: '["Generated/", "Pods/"]'
          # exclude-types: '[".graphql.swift"]'

```
