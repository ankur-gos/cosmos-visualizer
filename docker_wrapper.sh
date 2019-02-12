#!/bin/sh

# Just want to get the schema set up
node setup.js dummy dummy

if [ -z "${IMAGE_TAGGER_API_MODE}" ]
then
    echo "No startup mode specified -- assumed prediction ingest."
    MODE='prediction'
else
    MODE='annotate'
fi

if [ "$MODE" = "prediction" ]
then
    npm start &
    python import_predictions.py /xml /images
elif [ "$MODE" = "annotate" ]
then
    node setup.js images dummy_import &
    npm start
else
    echo "I don't know what to do."
    exit 1
fi

#while true
#do
#    sleep 1
#done


