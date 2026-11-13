# Final Checklist – Petal Haven

Write PASS or FAIL for each check. Use NOT TESTED for checks that still need verification.

## A. On My PC

1. npm test shows fail 0: PASS – 28 tests passed, 0 failed.
2. node server.js starts with no red errors: PASS – Server running on port 3000.
3. Page opens at http://localhost:3000 with data: PASS.
4. New account registered and logged in: PASS.
5. Add, change, delete from the page: NOT TESTED – Add and change were tested; PASS.
6. Wrong password shows a Problem message: NOT TESTED.
7. Keyboard-only login works: NOT TESTED.
8. Phone width has no sideways scroll: NOT TESTED.

## B. My Live Site

9. Live address opens: NOT TESTED – Deployment not completed.
10. Demo login works: NOT TESTED.
11. Add, change, delete work live: NOT TESTED.
12. Weather box works live: NOT TESTED.
13. GET /health live gives 200: NOT TESTED.
14. POST without a token gives 401: NOT TESTED.

## C. GitHub

15. Required project files are present: NOT VERIFIED.
16. .env and .db files are not present: NOT VERIFIED.
17. My weather key is not found in the code: NOT VERIFIED.
18. Commit history has 6 or more commits: NOT VERIFIED.
19. README has my live address: NOT VERIFIED.
20. api-docs.md has one row for every route: NEEDS VERIFICATION.

## D. I Can Explain

21. Why the password is hashed: NOT TESTED.
22. Why the weather key stays on the server: NOT TESTED.
23. The difference between 401 and 403: NOT TESTED.
24. What happens to my data when Render redeploys: NOT TESTED.