# testcafe-reporter-testrail

This is a TestCafe reporter pluging for TestRail. It publishes test run results to TestRail.  

# Install

```shell script
npm install testcafe-reporter-testrail
```
or
```shell script
yarn add testcafe-reporter-testrail
```

# Usage

Reporter name is `testrail`.

This reporter doesn't generate direct output, and it could lead to conflict if you leave `output` setting untouched.
It is possible to avoid conflicts by doing something like this: `{ "name": "testrail", "output": "/dev/null" }`.

# Environment variables

You must provide the following variables

`TESTRAIL_HOST`: your TestRail server address

`TESTRAIL_USERNAME`: user which will run tests

`TESTRAIL_PASS_OR_KEY`: password or API key

`TESTRAIL_PROJECT_NAME`: TestRail project name

`TESTRAIL_RUN_NAME`: Current test run name 
