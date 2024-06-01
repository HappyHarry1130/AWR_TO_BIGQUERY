#!/bin/bash

# Variable Initialization
DL_DIR_NAME=AWR_TO_BIGQUERY
DL_MAIN_FILE=index.js

# Ensure reports directory exists
mkdir -p ./reports

# Get a current date/time stamp
DATETIME=$(date -Iseconds)
LOG_FILE_NAME=$(echo $DL_DIR_NAME | sed 's/-/_/g')-$DATETIME.log

# Run Downloader
node $DL_MAIN_FILE 1> ./reports/$LOG_FILE_NAME 2>&1

# Error Checking
ERROR_COUNT=$(grep -ic error ./reports/$LOG_FILE_NAME)
if [ $ERROR_COUNT -ne 0 ]; then
    echo "One or more errors occurred during $DL_DIR_NAME processing - check the log for details"
fi

# Upload Logs
gsutil cp ./reports/$LOG_FILE_NAME gs://statbid/$DL_DIR_NAME/$LOG_FILE_NAME

# Cleanup
rm ./reports/*
