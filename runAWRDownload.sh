#!/bin/bash

DL_MAIN_FILE=./dist/main.js
DL_DIR_NAME=awr_downloader
DL_BQ_DATASET_NAME=AWR
DL_BQ_TABLE_NAME=Advanced_Web_Ranking
DL_BQ_TMP_TABLE_NAME=Temp_Advanced_Web_Ranking
DL_ZIP_DIR_NAME=downloaded
DL_EXTRACTED_DIR_NAME=extracted
DL_GS_BUCKET_NAME=gs://statbid1/statbid-argos-datacollection-prod/knifecenter/awr

gcloud auth activate-service-account --key-file=../service-account-key.json
mkdir -p ./reports
DATETIME=$(date -Iseconds)

LOG_FILE_NAME=$(echo $DL_DIR_NAME | sed 's/-/_/g')-$DATETIME.log

PROJECTS=$(jq -c '.projects' config.json)

echo "$PROJECTS" | jq -r '.[]' | while read -r PROJECT; do
  echo "Project: $PROJECT"
  node ./dist/main.js "$PROJECT" >> ./reports/$LOG_FILE_NAME 2>&1
  echo "$PROJECT" >> ./reports/$LOG_FILE_NAME 2>&1
  mkdir -p $DL_EXTRACTED_DIR_NAME >> ./reports/$LOG_FILE_NAME 2>&1
  unzip -o "$DL_ZIP_DIR_NAME"/"$PROJECT".zip -d "$DL_EXTRACTED_DIR_NAME" >> ./reports/$LOG_FILE_NAME 2>&1
done

find ./reports -type f -exec gsutil cp {} \; >> ./reports/$LOG_FILE_NAME 2>&1
gsutil cp "$DL_EXTRACTED_DIR_NAME"/*.csv "$DL_GS_BUCKET_NAME"/ >> ./reports/$LOG_FILE_NAME 2>&1

ERROR_COUNT=$(grep -ic error ./reports/$LOG_FILE_NAME)
if [ "$ERROR_COUNT" -eq 0 ]; then
  if ! bq show $DL_BQ_DATASET_NAME &>/dev/null; then
    bq mk --dataset $DL_BQ_DATASET_NAME >> ./reports/$LOG_FILE_NAME 2>&1
  fi

  bq load --source_format=CSV --autodetect \
    "$DL_BQ_DATASET_NAME"."$DL_BQ_TABLE_NAME" \
    "$DL_GS_BUCKET_NAME"/*.csv >> ./reports/$LOG_FILE_NAME 2>&1

  bq rm -f -t "${DL_BQ_DATASET_NAME}.${DL_BQ_TMP_TABLE_NAME}" >> ./reports/${LOG_FILE_NAME} 2>&1
fi

ERROR_COUNT=$(grep -ic error ./reports/$LOG_FILE_NAME)
if [ "$ERROR_COUNT" -ne 0 ]; then
  echo "One or more errors occurred during $DL_DIR_NAME processing - check the log for details"
fi

gsutil cp ./reports/$LOG_FILE_NAME "$DL_GS_BUCKET_NAME"/reports/ 

rm -r "$DL_ZIP_DIR_NAME"
rm -r ./reports/
