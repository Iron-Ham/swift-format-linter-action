# swift-format-linter-action

Sample workflow:

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

## What does this do?

This action allows you to run Apple's [`swift-format`](https://github.com/apple/swift-format) as a lint command to verify that code being checked in follows the guidelines you or your team have set. 
