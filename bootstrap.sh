#!/bin/bash
while true
do
  echo "Starting"
  node nos.js $1 $2 $3 $4
  if [ ${?} == 0 ] 
  then
   echo "."
   echo "."
   echo "System halted."
   break
 else 
   if [ ${?} == 1 ]
   then
    echo "Restarting"
  fi
fi
done
