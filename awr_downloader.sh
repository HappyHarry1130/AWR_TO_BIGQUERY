#
# This is a template for a downloader "run" script.
# To use this template:
# - Change the value of the $DL_DIR_NAME variable to the directory name of your downloader (within '/downloads')
# - Change the value of the $DL_MAIN_FILE variable to be the path to your downloader's main file ('index.js' or similar in Node.js)
# - Change the value of the $DL_BQ_DATASET_NAME variable to be the name of the BQ dataset you want to load
# - Change the value of the $DL_BQ_TABLE_NAME variable to be the name of the BQ table you want to load

DL_DIR_NAME=AWR_TO_BIGQUERY
DL_MAIN_FILE=index.js


cd /home/devops/$DL_DIR_NAME


# Get a current date/time stamp
DATETIME=$(date -Iseconds)
LOG_FILE_NAME=$(echo $DL_DIR_NAME | sed 's/-/_/g')-$DATETIME.log



# Get analytics from the downloader and stash them in Cloud Storage.
node $DL_MAIN_FILE 1> ./reports/$LOG_FILE_NAME 2>&1


# END CSV BLOCK

# If any errors occurred, write a message to the console.
ERROR_COUNT=$(cat ./reports/$LOG_FILE_NAME | grep -ic error)
if [ $ERROR_COUNT -ne 0 ]; then
        echo "One or more errors occurred during $DL_DIR_NAME processing - check the log for details"
fi

gsutil cp ./reports/$LOG_FILE_NAME gs://statbid/$DL_DIR_NAME/$LOG_FILE_NAME

# delete the JSON and log files.
rm ./reports/*