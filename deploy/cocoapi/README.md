# cocoAPI deployment

See ../../COCOAPI.md for commands and development details.
All scripts resolve the repository path relative to themselves.
Persistent state is ../../.cocoapi-runtime/ and must not be committed or removed.

The generated administrator password is stored in ../../.cocoapi-runtime/.env (0600); do not print it in logs or chat.
The initial administrator email is admin@cocoapi.local.

Run install.sh with Bash to install pinned container images. Run start.sh with Bash to start the three services and check health, homepage, administrator login and the cocoAPI name.
For managed cloud instances, keep inherited proxy configuration and the read-only CA bundle mount. The local health probe explicitly avoids sending loopback requests to the outbound proxy.

Source edits require rebuilding the application image. The default deployment currently uses the verified upstream image; source edits do not automatically update it.
The existing public website has not been replaced. No model accounts or API credentials have been configured.
