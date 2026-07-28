#!/bin/bash
service postgresql start
# Optionally: create a user/db here
# su postgres -c "createuser -s myuser && createdb mydb -O myuser"
exec "$@"
