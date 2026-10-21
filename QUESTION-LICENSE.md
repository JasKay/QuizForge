# Question attribution

Original QuizForge questions in lib/questions.ts are independently written practice material.
They are not official HCASC questions.

Questions in lib/community-questions.json are supplied by Open Trivia DB contributors:
https://opentdb.com/ — API: https://opentdb.com/api_config.php

This imported question data, including the adapted choice formatting and source explanation,
is available under Creative Commons Attribution-ShareAlike 4.0 International:
https://creativecommons.org/licenses/by-sa/4.0/

Changes: categories mapped to QuizForge subjects; URL encoding decoded; answer choices appended
to prompts; stable identifiers and source notices added. These are community answers, not a
fact-checked competition packet. Each question carries attribution and links to its source.
The data license applies to the imported question data; it does not relicense application code.

To add another batch without discarding existing questions:
npm run bank:expand -- 10
Then run checks, npm run db:migrate, and deploy. The importer deduplicates by prompt.
