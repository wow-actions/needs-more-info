import * as github from '@actions/github'
import merge from 'lodash.merge'
import yaml from 'js-yaml'
import { Util } from './util'

export namespace Config {
  export interface Section {
    checkTemplate?: boolean
    miniTitleLength?: number
    badTitles?: string[]
    labelToAdd?: string
    reactions?: string | string[]
    badTitleComment?: string | string[]
    badBodyComment?: string | string[]
  }

  export interface Definition extends Section {
    issue?: Section
    pullRequest?: Section
    excludeUsers?: string[]
    defaultComment?: string | string[]
  }

  const defaults: Definition = {
    checkTemplate: true,
    miniTitleLength: 8,
    labelToAdd: 'needs-more-info',
    reactions: ['-1', 'confused'],
    issue: {
      badTitles: ['update', 'updates', 'test', 'issue', 'debug', 'demo'],
      badTitleComment:
        'We would appreciate it if you could provide us with more info about this issue!',
      badBodyComment:
        'We would appreciate it if you could provide us with more info about this issue!',
    },
    pullRequest: {
      badTitles: ['update', 'updates', 'test'],
      badBodyComment:
        'We would appreciate it if you could provide us with more info about this pr!',
      badTitleComment:
        'We would appreciate it if you could provide us with more info about this pr!',
    },
  }

  export async function get(
    octokit: ReturnType<typeof github.getOctokit>,
    path?: string,
  ): Promise<Definition> {
    try {
      if (path) {
        const content = await Util.getFileContent(
          octokit,
          github.context.repo.repo,
          path,
        )
        if (content) {
          const config = yaml.load(content) as Definition
          return merge({}, defaults, config)
        }
      }

      return defaults
    } catch (error) {
      if (error.status === 404) {
        return defaults
      }

      throw error
    }
  }
}
