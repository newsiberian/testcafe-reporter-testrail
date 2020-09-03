import TestrailApiClient from 'testrail-api';

/**
 * @see: https://devexpress.github.io/testcafe/documentation/reference/plugin-api/reporter.html#testruninfo-object
 */
interface TestRunInfo {
  errs: { errMsg: string }[];
  durationMs: number;
  skipped: boolean;
}

/**
 * @see: https://www.gurock.com/testrail/docs/api/reference/statuses
 */
enum TestStatus {
  Passed = 1,
  Blocked = 2,
  Untested = 3,
  Retest = 4,
  Failed = 5,
  // vvv this is custom
  // Skipped = 6,
}

module.exports = function() {
  return {
    noColors: true,
    results: [] as TestrailApiClient.INewTestResult[],

    reportTaskStart(/* startTime, userAgents, testCount */) {
      // throw new Error('Not implemented');
    },

    reportFixtureStart(/* name, path */) {
      // throw new Error('Not implemented');
    },

    reportTestStart(/* name, testMeta */) {
      // NOTE: This method is optional.
    },

    reportTestDone(name: string, testRunInfo: TestRunInfo) {
      if (!name.includes('#')) {
        this.throwError(
          `Can\'t find Testrail test id in test (${name}) name. Please use "#" before it`,
        );
      }

      // extracting testrail test id from test name
      const dirtyTestId = name
        .split(' ')
        .filter(chunk => chunk.includes('#'))[0];
      const testId = dirtyTestId.slice(1);
      const status = getTestStatus(testRunInfo);

      const commentObj =
        status === 5
          ? {
              comment: testRunInfo.errs[0].errMsg,
            }
          : {};

      this.results.push({
        test_id: +testId,
        status_id: status,
        // @ts-ignore
        elapsed: this.moment
          .duration(testRunInfo.durationMs)
          .format('h[h] mm[m] ss[s]'),
        ...commentObj,
      });
    },

    async reportTaskDone(/* endTime, passed, warnings */) {
      if (!this.results.length) {
        return;
      }

      if (
        !process.env.TESTRAIL_HOST ||
        !process.env.TESTRAIL_USERNAME ||
        !process.env.TESTRAIL_PASS_OR_KEY ||
        !process.env.TESTRAIL_PROJECT_NAME ||
        !process.env.TESTRAIL_RUN_NAME
      ) {
        this.throwError(
          'Error: TESTRAIL_HOST, TESTRAIL_USERNAME, TESTRAIL_PASS_OR_KEY, TESTRAIL_PROJECT_NAME and TESTRAIL_RUN_NAME must be set as environment variables for the reporter plugin to push the result to the Testrail',
        );

        // when not all variables are provided, we do nothing. This can be useful for development purposes, when
        // you don't want to send results
        return;
      }

      const testrail = new TestrailApiClient({
        host: process.env.TESTRAIL_HOST,
        user: process.env.TESTRAIL_USERNAME,
        password: process.env.TESTRAIL_PASS_OR_KEY,
      });

      try {
        const { body: projects } = await testrail.getProjects();
        const projectId = this.getProjectId(projects);

        const { body: runs } = await testrail.getRuns(projectId, {});
        const testRunId = this.getTestRunId(runs);

        await testrail.addResults(testRunId, this.results);
      } catch (err) {
        // @ts-ignore
        this.newline()
          // @ts-ignore
          .write(this.chalk.red.bold(this.symbols.err))
          .write(err.message.error);
      }
    },

    getProjectId(projects: TestrailApiClient.IProject[]): number | never {
      const index = projects.findIndex(
        project =>
          project.name.toLowerCase() ===
          (process.env.TESTRAIL_PROJECT_NAME as string).toLowerCase(),
      );

      if (index !== -1) {
        return projects[index].id;
      }

      this.throwError('Project not found');
      process.exit(1);
    },

    getTestRunId(projects: TestrailApiClient.ITestRun[]): number | never {
      const index = projects.findIndex(
        project =>
          project.name.toLowerCase() ===
          (process.env.TESTRAIL_RUN_NAME as string).toLowerCase(),
      );

      if (index !== -1) {
        return projects[index].id;
      }

      this.throwError('Test run not found');
      process.exit(1);
    },

    throwError(text: string): void {
      // @ts-ignore
      this.newline()
        .write(
          // @ts-ignore
          this.chalk.red.bold(text),
        )
        .newline()
        .newline();
    },
  };
};

function getTestStatus(testRunInfo: TestRunInfo): TestStatus {
  if (testRunInfo.errs.length) {
    return TestStatus.Failed;
  } else if (testRunInfo.skipped) {
    // TODO: change to Blocked;
    return TestStatus.Untested;
  }
  return TestStatus.Passed;
}
