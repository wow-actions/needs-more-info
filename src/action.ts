import * as core from '@actions/core'
import * as github from '@actions/github'
import { Util } from './util'
import { Config } from './config'
import { Reaction } from './reaction'
import { Octokit } from './octokit'

export namespace Action {
  async function getConfig(octokit: Octokit) {
    const path = core.getInput('CONFIG_FILE')
    const config = await Config.get(octokit, path)

    if (path) {
      core.info(
        `Load config from "${path}": \n${JSON.stringify(config, null, 2)}`,
      )
    }

    return config
  }

  async function handle() {
    const { context } = github
    const payload = context.payload.issue || context.payload.pull_request
    if (payload) {
      const isIssue = context.payload.issue != null
      const title = payload.title as string
      const { body } = payload
      const { user } = payload

      let badBody = !body || !body.trim()
      let badTitle = !title || !title.trim()

      const octokit = Octokit.get()
      const config = await getConfig(octokit)

      if (config.excludeUsers) {
        if (config.excludeUsers.includes(user.login)) {
          return
        }
      }

      const options = (isIssue ? config.issue : config.pullRequest) || {}
      const miniTitleLength = options.miniTitleLength || config.miniTitleLength
      if (!badTitle && miniTitleLength != null) {
        core.debug('Check title length')
        badTitle = Util.getStringLength(title.trim()) <= miniTitleLength
      }

      if (!badTitle) {
        core.debug('Check bad titles list')
        const badTitles = options.badTitles || config.badTitles
        badTitle = badTitles != null && badTitles.includes(title.toLowerCase())
      }

      if (!badBody) {
        const checkTemplate =
          options.checkTemplate != null
            ? options.checkTemplate
            : config.checkTemplate

        if (checkTemplate !== false) {
          core.debug('Check body with templates')
          badBody = !(isIssue
            ? await Util.isIssueBodyValid(octokit, body!)
            : await Util.isPullRequestBodyValid(octokit, body!))
        }
      }

      const labelToAdd = options.labelToAdd || config.labelToAdd
      const label = labelToAdd && labelToAdd.trim()
      if (label) {
        if (badTitle || badBody) {
          await octokit.rest.issues.addLabels({
            ...context.repo,
            issue_number: payload.number,
            labels: [label],
          })
        } else {
          try {
            await octokit.rest.issues.removeLabel({
              ...context.repo,
              issue_number: payload.number,
              name: label,
            })
          } catch (error) {
            // pass
          }
        }
      }

      const badTitleComment =
        options.badTitleComment ||
        config.badTitleComment ||
        config.defaultComment
      const badBodyComment =
        options.badBodyComment || config.badBodyComment || config.defaultComment
      const reactions = options.reactions || config.reactions

      const args = { author: payload.user.login }
      const createComment = async (comment: string | string[]) => {
        const { data } = await octokit.rest.issues.createComment({
          ...context.repo,
          issue_number: payload.number,
          body: Util.pickComment(comment, args),
        })
        if (reactions) {
          await Reaction.add(octokit, data.id, reactions)
        }
      }

      if (
        badBody &&
        badTitle &&
        badBodyComment &&
        badTitleComment === badBodyComment
      ) {
        await createComment(badBodyComment)
      } else {
        if (badTitle && badTitleComment) {
          await createComment(badTitleComment)
        }

        if (badBody && badBodyComment) {
          await createComment(badBodyComment)
        }
      }
    }
  }

  export async function run() {
    try {
      const { context } = github
      core.debug(`event: ${context.eventName}`)
      core.debug(`action: ${context.payload.action}`)

      if (
        Util.isValidEvent('issues', 'opened') ||
        Util.isValidEvent('issues', 'edited') ||
        Util.isValidEvent('issues', 'reopened') ||
        Util.isValidEvent('pull_request', 'opened') ||
        Util.isValidEvent('pull_request', 'edited') ||
        Util.isValidEvent('pull_request', 'reopened') ||
        Util.isValidEvent('pull_request_target', 'opened') ||
        Util.isValidEvent('pull_request_target', 'edited') ||
        Util.isValidEvent('pull_request_target', 'reopened')
      ) {
        await handle()
      }
    } catch (e) {
      core.setFailed(e)
    }
  }
}
