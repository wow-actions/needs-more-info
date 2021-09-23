import * as core from '@actions/core'
import * as github from '@actions/github'
import mustache from 'mustache'
import random from 'lodash.random'
import { Octokit } from './octokit'

export namespace Util {
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
    const { context } = github
    const { payload } = context
    if (event === context.eventName) {
      return action == null || action === payload.action
    }
    return false
  }

  export async function getFileContent(
    octokit: Octokit,
    repo: string,
    path: string,
  ) {
    try {
      const res = await octokit.rest.repos.getContent({
        owner: github.context.repo.owner,
        repo,
        path,
      })

      const { content } = res.data as any
      return Buffer.from(content, 'base64').toString()
    } catch (e) {
      core.debug(
        `[getFileContent] ${github.context.repo.owner}/${repo}/${path}: ${e}`,
      )
      return null
    }
  }

  async function getDirSubPaths(
    octokit: Octokit,
    repo: string,
    path: string,
  ): Promise<string[] | null> {
    try {
      const res = await octokit.rest.repos.getContent({
        owner: github.context.repo.owner,
        repo,
        path,
      })
      return (res.data as any).map((f: any) => f.path)
    } catch (e) {
      core.debug(
        `[getDirSubPaths] ${github.context.repo.owner}/${repo}/${path}: ${e}`,
      )
      return null
    }
  }

  async function getIssueTemplates(octokit: Octokit) {
    let defaultTemplate = await getFileContent(
      octokit,
      github.context.repo.repo,
      '.github/ISSUE_TEMPLATE.md',
    )

    if (defaultTemplate != null) {
      return [defaultTemplate]
    }

    defaultTemplate = await getFileContent(
      octokit,
      '.github',
      '.github/ISSUE_TEMPLATE.md',
    )
    if (defaultTemplate != null) {
      return [defaultTemplate]
    }

    const templates: string[] = []
    let paths = await getDirSubPaths(
      octokit,
      github.context.repo.repo,
      '.github/ISSUE_TEMPLATE',
    )
    if (paths !== null) {
      const deferreds = paths.map((path) =>
        getFileContent(octokit, github.context.repo.repo, path),
      )

      const contents = await Promise.all(deferreds)
      contents.forEach((content) => {
        if (content) {
          templates.push(content)
        }
      })
    }

    paths = await getDirSubPaths(octokit, '.github', '.github/ISSUE_TEMPLATE')
    if (paths !== null) {
      const deferreds = paths.map((path) =>
        getFileContent(octokit, '.github', path),
      )

      const contents = await Promise.all(deferreds)
      contents.forEach((content) => {
        if (content) {
          templates.push(content)
        }
      })
    }

    return templates
  }

  async function getPullRequestTemplate(octokit: Octokit) {
    let template = getFileContent(
      octokit,
      github.context.repo.repo,
      '.github/PULL_REQUEST_TEMPLATE.md',
    )

    if (template == null) {
      template = getFileContent(
        octokit,
        '.github',
        '.github/PULL_REQUEST_TEMPLATE.md',
      )
    }

    return template
  }

  function isMatchTemplate(body: string, template: string | null) {
    if (template) {
      const b = body.trim().replace(/[\r\n]/g, '')
      const t = template.trim().replace(/[\r\n]/g, '')
      return t.includes(b)
    }

    return false
  }

  export async function isIssueBodyValid(octokit: Octokit, body: string) {
    if (!body || !body.trim()) {
      return false
    }

    const templates = await getIssueTemplates(octokit)
    core.debug(`templates: ${JSON.stringify(templates)}`)

    // eslint-disable-next-line no-restricted-syntax
    for (const template of templates) {
      if (isMatchTemplate(body, template)) {
        return false
      }
    }

    return true
  }

  export async function isPullRequestBodyValid(octokit: Octokit, body: string) {
    if (!body || !body.trim()) {
      return false
    }

    const template = await getPullRequestTemplate(octokit)
    return !isMatchTemplate(body, template)
  }

  export function getStringLength(str: string) {
    let len = 0
    for (let i = 0; i < str.length; i += 1) {
      if (str.charCodeAt(i) > 127 || str.charCodeAt(i) === 94) {
        len += 2
      } else {
        len += 1
      }
    }
    return len
  }
}
