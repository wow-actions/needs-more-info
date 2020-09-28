# Needs More Info

> A Github Action to request more info from newly opened Pull Requests and Issues that contain either default titles or whose description is left blank.

## Usage

Create a `.github/workflows/needs-more-info.yml` file in the repository you want to install this action, then add the following to it:

```yml
name: Needs More Info
on:
  pull_request:
    types: [opened]
  issues:
    types: [opened]
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: bubkoo/needs-more-info@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CONFIG_FILE: Yaml config file path
```

## Config

Full config define as:

```ts
interface Config {
  /**
   * Add a list of people whose Issues/PRs will not be commented on.
   */
  excludeUsers?: string[]

  /**
   * Require Issues or PRs to contain more information than what is provided
   * in the templates. Will fail if the body is equal to a provided template.
   */
  checkTemplate?: boolean
  /**
   * Default mini length of titles to check against for lack of descriptiveness.
   */
  miniTitleLength?: number
  /**
   * Default titles to check against for lack of descriptiveness.
   */
  badTitles?: string[]
  /**
   * Default label to be added to issues or PRs with insufficient
   * information given.
   */
  labelToAdd?: string
  /**
   * Default reactions to be added to issues or PRs with insufficient
   * information given.
   *
   * Available reactions: "-1" | "confused" | "+1" | "laugh" | "heart" |
   * "hooray" | "rocket" | "eyes".
   *
   * Can be either a ,/space joined string or an reactions array.
   * - '-1, confused'
   * - '-1 confused'
   * - ['-1', 'confused']
   */
  reactions?: string | string[]
  /**
   * Default message to comment on issues or PRs when have bad title.
   *
   * Can be either a string or an array(random pick a comment).
   */
  badTitleComment?: string | string[]
  /**
   * Default message to comment on issues or PRs when have bad body.
   *
   * Can be either a string or an array(random pick a comment).
   */
  badBodyComment?: string | string[]
  /**
   * Default message to comment on issues or PRs when have bad title or bad body.
   *
   * Can be either a string or an array(random pick a comment).
   */
  defaultComment?: string | string[]

  issue?: {
    /**
     * Require Issues to contain more information than what is provided in
     * the issue templates. Will fail if the issue's body is equal to a
     * provided template.
     */
    checkTemplate?: boolean
    /**
     * Mini length of titles to check against for lack of descriptiveness.
     */
    miniTitleLength?: number
    /**
     * Bad titles to check against for lack of descriptiveness.
     */
    badTitles?: string[]
    /**
     * Label to be added to Issues with insufficient information given.
     */
    labelToAdd?: string
    /**
     * Reactions to be added to issues with insufficient information given.
     *
     * Available reactions: "-1" | "confused" | "+1" | "laugh" | "heart" |
     * "hooray" | "rocket" | "eyes".
     *
     * Can be either a ,/space joined string or an reactions array.
     * - '-1, confused'
     * - '-1 confused'
     * - ['-1', 'confused']
     */
    reactions?: string | string[]
    /**
     * Message to comment on issues when have bad title.
     *
     * Can be either a string or an array(random pick a comment).
     */
    badTitleComment?: string | string[]
    /**
     * Message to comment on issues when have bad body.
     *
     * Can be either a string or an array(random pick a comment).
     */
    badBodyComment?: string | string[]
  }

  pullRequest?: {
    /**
     * Require PRs to contain more information than what is provided in the PR
     * template. Will fail if the pull request's body is equal to the provided
     * template.
     */
    checkTemplate?: boolean
    /**
     * Mini length of titles to check against for lack of descriptiveness.
     */
    miniTitleLength?: number
    /**
     * Bad titles to check against for lack of descriptiveness.
     */
    badTitles?: string[]
    /**
     * Label to be added to PRs with insufficient information given.
     */
    labelToAdd?: string
    /**
     * Reactions to be added to PRs with insufficient information given.
     *
     * Available reactions: "-1" | "confused" | "+1" | "laugh" | "heart" |
     * "hooray" | "rocket" | "eyes".
     *
     * Can be either a ,/space joined string or an reactions array.
     * - '-1, confused'
     * - '-1 confused'
     * - ['-1', 'confused']
     */
    reactions?: string | string[]
    /**
     * Message to comment on PRs when have bad title.
     *
     * Can be either a string or an array(random pick a comment).
     */
    badTitleComment?: string | string[]
    /**
     * Message to comment on PRs when have bad body.
     *
     * Can be either a string or an array(random pick a comment).
     */
    badBodyComment?: string | string[]
  }
}
```

Custom config will be [deep merged](https://lodash.com/docs/4.17.15#merge) with the following default config:

```yaml
checkTemplate: true
labelToAdd: needs-more-info
reactions:
  - '-1'
  - confused
miniTitleLength: 8
issue:
  badTitles:
    - update
    - updates
    - test
    - issue
    - debug
    - demo
  badTitleComment: >
    We would appreciate it if you could provide us with more info about this issue!


  badBodyComment: >
    We would appreciate it if you could provide us with more info about this issue!


pullRequest:
  badTitles:
    - update
    - updates
    - test
  badBodyComment: >
    We would appreciate it if you could provide us with more info about this pr!


  badTitleComment: >
    We would appreciate it if you could provide us with more info about this pr!
```

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
