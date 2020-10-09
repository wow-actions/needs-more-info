import * as core from '@actions/core'
import * as github from '@actions/github'
import mustache from 'mustache'
import random from 'lodash.random'

export namespace Util {
  export function getOctokit() {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    return github.getOctokit(token)
  }

  export function pickComment(
    comment: string | string[],
    args?: { [key: string]: string },
  ) {
    let result: string
    if (typeof comment === 'string' || comment instanceof String) {
      result = comment.toString()
    } else {
      const pos = random(0, comment.length, false)
      result = comment[pos] || comment[0]
    }

    return args ? mustache.render(result, args) : result
  }

  export function isValidEvent(event: string, action?: string) {
    const context = github.context
    const payload = context.payload
    if (event === context.eventName) {
      return action == null || action === payload.action
    }
    return false
  }

  export async function getFileContent(
    octokit: ReturnType<typeof getOctokit>,
    path: string,
  ) {
    try {
      const response = await octokit.repos.getContent({
        ...github.context.repo,
        path,
      })

      const content = response.data.content
      return Buffer.from(content, 'base64').toString()
    } catch (e) {
      core.error(e)
      return null
    }
  }

  async function getDirSubPaths(
    octokit: ReturnType<typeof getOctokit>,
    path: string,
  ): Promise<string[] | null> {
    try {
      const res = await octokit.repos.getContent({
        ...github.context.repo,
        path,
      })
      return (res.data as any).map((f: any) => f.path)
    } catch (err) {
      return null
    }
  }

  async function getIssueTemplates(octokit: ReturnType<typeof getOctokit>) {
    const defaultTemplate = await getFileContent(
      octokit,
      '.github/ISSUE_TEMPLATE.md',
    )

    if (defaultTemplate != null) {
      return [defaultTemplate]
    }

    const paths = await getDirSubPaths(octokit, '.github/ISSUE_TEMPLATE')
    if (paths !== null) {
      const templates = []
      for (const path of paths) {
        const template = await getFileContent(octokit, path)
        if (template != null) {
          templates.push(template)
        }
      }

      return templates
    }

    return []
  }

  async function getPullRequestTemplate(
    octokit: ReturnType<typeof getOctokit>,
  ) {
    return getFileContent(octokit, '.github/PULL_REQUEST_TEMPLATE.md')
  }

  function isMatchTemplate(body: string, template: string | null) {
    if (template) {
      const b = body.trim().replace(/[\r\n]/g, '')
      const t = template.trim().replace(/[\r\n]/g, '')
      return t.includes(b)
    }

    return false
  }

  export async function isIssueBodyValid(
    octokit: ReturnType<typeof getOctokit>,
    body: string,
  ) {
    if (!body || !body.trim()) {
      return false
    }

    const templates = await getIssueTemplates(octokit)
    for (const template of templates) {
      if (isMatchTemplate(body, template)) {
        return false
      }
    }

    return true
  }

  export async function isPullRequestBodyValid(
    octokit: ReturnType<typeof getOctokit>,
    body: string,
  ) {
    if (!body || !body.trim()) {
      return false
    }

    const template = await getPullRequestTemplate(octokit)
    return !isMatchTemplate(body, template)
  }
}
