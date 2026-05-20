# Changelog

## [1.1.1](https://github.com/michalschroeder/page2md/compare/v1.1.0...v1.1.1) (2026-05-20)


### Bug Fixes

* **token-comparison:** repair import, parallelize, label errors ([#39](https://github.com/michalschroeder/page2md/issues/39)) ([d504a74](https://github.com/michalschroeder/page2md/commit/d504a7479e518b0a9e41a2707a4530f803f5e953))

## [1.1.0](https://github.com/michalschroeder/page2md/compare/v1.0.0...v1.1.0) (2026-05-11)


### Features

* --no-render flag, skip Chromium for static pages ([#18](https://github.com/michalschroeder/page2md/issues/18)) ([012b33f](https://github.com/michalschroeder/page2md/commit/012b33fffb9fef1569dcfa2188494f7bf19adbd1)), closes [#5](https://github.com/michalschroeder/page2md/issues/5)
* --timeout flag (closes [#3](https://github.com/michalschroeder/page2md/issues/3)) ([#35](https://github.com/michalschroeder/page2md/issues/35)) ([0f68828](https://github.com/michalschroeder/page2md/commit/0f68828e7384bf39d232b3f11eeb9f2fb87dd077))
* --user-agent flag ([#25](https://github.com/michalschroeder/page2md/issues/25)) ([70ad10d](https://github.com/michalschroeder/page2md/commit/70ad10d3d2d7dba2db6c806acc44629d58ca5f84))
* **args:** reject flag-like values for -o and --user-agent ([#34](https://github.com/michalschroeder/page2md/issues/34)) ([e608d2f](https://github.com/michalschroeder/page2md/commit/e608d2f74ac9461efa6b911f3cd4644e4870fc0f)), closes [#30](https://github.com/michalschroeder/page2md/issues/30)
* reject empty -o/--output (closes [#29](https://github.com/michalschroeder/page2md/issues/29)) ([#33](https://github.com/michalschroeder/page2md/issues/33)) ([c87e1c3](https://github.com/michalschroeder/page2md/commit/c87e1c38a6fb9aec65274b94cae9ced5bee2a4b4))
* token-usage comparison script + report ([#37](https://github.com/michalschroeder/page2md/issues/37)) ([07ce0a7](https://github.com/michalschroeder/page2md/commit/07ce0a7d90436f413ce1ccadae8019b6153e5804))


### Bug Fixes

* **deps:** pin dependencies ([#11](https://github.com/michalschroeder/page2md/issues/11)) ([17fc9c9](https://github.com/michalschroeder/page2md/commit/17fc9c978b9a96804e15eca244166c40a9abf82e))
* **deps:** update dependency playwright to v1.60.0 ([#31](https://github.com/michalschroeder/page2md/issues/31)) ([a9fb7a5](https://github.com/michalschroeder/page2md/commit/a9fb7a5e9dd866e156e3fe2cfcf33aa70891f5ad))


### Performance Improvements

* share DOM between cleaner and defuddle (closes [#19](https://github.com/michalschroeder/page2md/issues/19)) ([#36](https://github.com/michalschroeder/page2md/issues/36)) ([e04e0e9](https://github.com/michalschroeder/page2md/commit/e04e0e942276503ce560fafc48b82d1958960474))

## 1.0.0 (2026-05-10)


### Features

* initial release ([77ffdcd](https://github.com/michalschroeder/page2md/commit/77ffdcd6d89c8ddaf7df560c9bfff2e2f35fee66))
