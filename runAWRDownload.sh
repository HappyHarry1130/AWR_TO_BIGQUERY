
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
  node ./dist/main.js "$PROJECT">> ./reports/$LOG_FILE_NAME 2>&1
  echo "$PROJECT"1> ./reports/awr-downloader-"$DATETIME".log 2>&1
    mkdir -p $DL_EXTRACTED_DIR_NAME
    unzip -o "$DL_ZIP_DIR_NAME"/"$PROJECT".zip -d "$DL_EXTRACTED_DIR_NAME"
#    rm $DL_ZIP_DIR_NAME
done

find ./reports -type f -exec gsutil cp {} "$DL_GS_BUCKET_NAME"/reports \; >> ./reports/$LOG_FILE_NAME 2>&1

gsutil cp "$DL_EXTRACTED_DIR_NAME"/*.csv "$DL_GS_BUCKET_NAME"/>> ./reports/$LOG_FILE_NAME 2>&1
if [ $ERROR_COUNT -eq 0 ]; then
    if ! bq show $DL_BQ_DATASET_NAME &>/dev/null; then
        bq mk --dataset $DL_BQ_DATASET_NAME >> ./reports/$LOG_FILE_NAME 2>&1
    fi

    bq load --source_format=CSV --autodetect \
        "$DL_BQ_DATASET_NAME"."$DL_BQ_TABLE_NAME" \
        "$DL_GS_BUCKET_NAME"/*.csv>> ./reports/$LOG_FILE_NAME 2>&1

    bq rm -f -t "${DL_BQ_DATASET_NAME}.${DL_BQ_TMP_TABLE_NAME}" >> ./reports/${LOG_FILE_NAME} 2>&1
fi

ERROR_COUNT=$(grep -ic error ./reports/$LOG_FILE_NAME)
if [ $ERROR_COUNT -ne 0 ]; then
    echo "One or more errors occurred during $DL_DIR_NAME processing - check the log for details"
fi

gsutil cp ./reports/$LOG_FILE_NAME gs://statbid/$DL_DIR_NAME/$LOG_FILE_NAME

rm ./reports/
rm ./downloaded/
# ERROR_COUNT=$(cat ./reports/$LOG_FILE_NAME | grep -ic error)

# if [ $ERROR_COUNT -eq 0 ]; then
#     if ! bq show $DL_BQ_DATASET_NAME &>/dev/null; then
#         bq mk --dataset $DL_BQ_DATASET_NAME >> ./reports/$LOG_FILE_NAME 2>&1
#     fi

#     bq load --source_format=CSV --autodetect \
#     ${DL_BQ_DATASET_NAME}.${DL_BQ_TMP_TABLE_NAME} \
#     gs://statbid/$DL_DIR_NAME/awr_downloader_$DATETIME.csv >> ./reports/$LOG_FILE_NAME 2>&1

#     if ! bq show --format=prettyjson "${DL_BQ_DATASET_NAME}.${DL_BQ_TABLE_NAME}" > /dev/null 2>&1; then
#         echo "Table ${DL_BQ_TABLE_NAME} does not exist. Creating table..." >> ./reports/${LOG_FILE_NAME} 2>&1
#         bq cp -n "${DL_BQ_DATASET_NAME}.${DL_BQ_TMP_TABLE_NAME}" "${DL_BQ_DATASET_NAME}.${DL_BQ_TABLE_NAME}" >> ./reports/${LOG_FILE_NAME} 2>&1
#     fi

#     bq query --nouse_legacy_sql \
#     "MERGE \`${DL_BQ_DATASET_NAME}.${DL_BQ_TABLE_NAME}\` T
#     USING \`${DL_BQ_DATASET_NAME}.${DL_BQ_TMP_TABLE_NAME}\` S
#     ON CONCAT(T.Date, T.Website, T.Project) = CONCAT(S.Date, S.Website, S.Project)
#     WHEN NOT MATCHED THEN
#     INSERT ROW" >> ./reports/${LOG_FILE_NAME} 2>&1

#     bq rm -f -t "${DL_BQ_DATASET_NAME}.${DL_BQ_TMP_TABLE_NAME}" >> ./reports/${LOG_FILE_NAME} 2>&1
# fi

# ERROR_COUNT=$(grep -ic error ./reports/$LOG_FILE_NAME)
# if [ $ERROR_COUNT -ne 0 ]; then
#     echo "One or more errors occurred during $DL_DIR_NAME processing - check the log for details"
# fi

# gsutil cp ./reports/$LOG_FILE_NAME gs://statbid/$DL_DIR_NAME/$LOG_FILE_NAME

# rm ./reports/*
# rm awr-downloader-combined.csv