# swift-format-linter-action

Sample workflow:

```yml
on: [pull_request]

jobs:
  swift-format-lint:
    runs-on: macos-latest
    name: Swift-Format
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Select Xcode
        run: sudo xcode-select -switch /Applications/Xcode_11.4.app
      - name: swift build
        run: brew install mint && mint install apple/swift-format@swift-5.2-branch
      - name: Lint
        uses: ./ # Uses an action in the root directory
        id: swift-format-lint
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          excludes: '["whatev"]'
```