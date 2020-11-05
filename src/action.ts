import * as core from '@actions/core'
import * as github from '@actions/github'
import { Util } from './util'
import { Config } from './config'
import { Reaction } from './reaction'

export namespace Action {
  export async function run(context = github.context) {
    try {
      core.debug(`event: ${context.eventName}`)
      core.debug(`action: ${context.payload.action}`)

      const isIssue = Util.isValidEvent('issues', 'opened')
      const isPROpened =
        Util.isValidEvent('pull_request', 'opened') ||
        Util.isValidEvent('pull_request_target', 'opened')

      if (isIssue || isPROpened) {
        const payload = context.payload.issue || context.payload.pull_request
        if (payload) {
          const title = payload.title as string
          const body = payload.body
          const user = payload.user

          let badBody = !body || !body.trim()
          let badTitle = !title || !title.trim()

          const configPath = core.getInput('CONFIG_FILE')
          const octokit = Util.getOctokit()
          const config = await Config.get(octokit, configPath)

          core.info(
            `Load config from "${configPath}": \n${JSON.stringify(
              config,
              null,
              2,
            )}`,
          )

          if (config.excludeUsers) {
            if (config.excludeUsers.includes(user.login)) {
              return
            }
          }

          const options = (isIssue ? config.issue : config.pullRequest) || {}
          const miniTitleLength =
            options.miniTitleLength || config.miniTitleLength
          if (!badTitle && miniTitleLength != null) {
            core.info('Check title length')
            badTitle = title.trim().length <= miniTitleLength
          }

          if (!badTitle) {
            core.info('Check bad titles list')
            const badTitles = options.badTitles || config.badTitles
            badTitle =
              badTitles != null && badTitles.includes(title.toLowerCase())
          }

          if (!badBody) {
            const checkTemplate =
              options.checkTemplate != null
                ? options.checkTemplate
                : config.checkTemplate

            if (checkTemplate !== false) {
              core.info('Check body with templates')
              badBody = !(isIssue
                ? await Util.isIssueBodyValid(octokit, body!)
                : await Util.isPullRequestBodyValid(octokit, body!))
            }
          }

          if (badTitle || badBody) {
            const labelToAdd = options.labelToAdd || config.labelToAdd
            if (labelToAdd && labelToAdd.trim()) {
              await octokit.issues.addLabels({
                ...context.repo,
                issue_number: payload.number,
                labels: [labelToAdd.trim()],
              })
            }
          }

          const badTitleComment =
            options.badTitleComment ||
            config.badTitleComment ||
            config.defaultComment
          const badBodyComment =
            options.badBodyComment ||
            config.badBodyComment ||
            config.defaultComment
          const reactions = options.reactions || config.reactions

          const args = { author: payload.user.login }
          const createComment = async (comment: string | string[]) => {
            const { data } = await octokit.issues.createComment({
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
    } catch (e) {
      core.error(e)
      core.setFailed(e.message)
    }
  }
}
