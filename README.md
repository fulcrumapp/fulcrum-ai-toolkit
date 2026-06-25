# FulcrumRepoTemplate

Welcome to your new Github repository. A few things to point out:

## SetupFromTemplate

### README.md

First this README.md file... Once you are finished updating values you
should update this file to be useful for the code repository.

### CICD

The following sections deal with all the different CICD components.

By default the generated repository will be autoconfigured with the standard (shared)
CI. When the repositories are created via this tool, a push to main will occur
and that push will trigger a CI pipeline run in Tekton. If that pipeline run succeeds
then the standard CI works correctly.

If it does not work correctly, please reach out to the Monkeys team to see if the
failures can be fixed. If unable to succeed with shared CI, then move on to the
pac-setup

#### ci/config.yaml

The ci config file holds important DEFAULT informatin for getting this repository
wired up into the CICD system. Please take a look at the default settings to see
what options are available.

### pac-setup

The .tekton/ directory is a placeholder for useages of the pipelines-as-code CI tool.
The pipelines-as-code (pac) tool is used IF the code repository cannot use our
existing/shared CICD workflow.

If you find that the existing flow wont work for this repository, you can reach out to
a member of the chaos-monkeys team to get this repository added to pac. Please provide
them with these commands:

```bash
# Git clone this repo
git clone XXXXXXX
# Change into newly cloned repo
cd XXXXX
# If there is a working branch
git checkout XXXXXX
# Add repo to PAC
#
# When prompted, the defaults are acceptable
# EXCEPT for namespace. Ensure that value is: `cicd`
tkn-pac create repository
```

# sampleAPP

Update information here for new repository and remove the template
section above.

A few setup thing:

- If using knative (enableksvc) you will need to update the value of domain to something useful in:
  - charts/sampleCHARTNAME/values.yaml
  - charts/sampleCHARTNAME/helm_vars/values.preview.yaml
  - charts/sampleCHARTNAME/helm_vars/values.production.au.yaml
  - charts/sampleCHARTNAME/helm_vars/values.production.eu.yaml

# Getting started with building Dockerfiles

If this is the first time you are working with docker files there are a few things to keep in mind:

- Avoid pulling images from Docker Hub (docker.io) -- easy to get throttled, and unverified images are everywhere.
- All apps should be running as Non-root (if possible) -- there are several examples of our apps running as user `fulcrum` for example [koop](https://github.com/fulcrumapp/koop/blob/main/Dockerfile)
- The containers should be run in read-only mode.. so if your application needs to download files you should utilize other solutions (temp, s3, etc)
- Images should avoid container dev debug packages (see the koop file above on how to utilzie a builder image and copy files)

yes
