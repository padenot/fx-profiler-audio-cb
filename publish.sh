#!/bin/sh

if [ ! -f ~/.amo-credentials ]
then
  echo 'missing ~/.amo-credentials'
  exit 1
fi

source ~/.amo-credentials

if [ -z $AMO_JWT_ISSUER ]
then
  echo 'missing $AMO_JWT_ISSUER'
  exit 1
fi

if [ -z $AMO_JWT_SECRET ]
then
  echo 'missing $AMO_JWT_SECRET'
  exit 1
fi

web-ext sign --api-key=$AMO_JWT_ISSUER --api-secret=$AMO_JWT_SECRET
