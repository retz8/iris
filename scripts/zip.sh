#!/bin/bash

# create a zip file of the chrome extension and git push it to the repository
zip -r extension.zip extension/
git add extension.zip
git commit -m "chore: update extension zip"
git push origin main