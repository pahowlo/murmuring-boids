#!/bin/sh

# Validate that the package version is greater or equal than the provided number.
# Inputs:
#   $1: Name of shell package to check. Version is obtained using '--version' option
#   $2: Minimal version for that package
function more_recent_version()
{
    local package=$1
    local min_version=$2
    # Verify the package exists
    local base_message="Required: $package must be installed with version >= $min_version"

    local package_version=$(
        $package --version 2>/dev/null | head -1 | grep -oE "[0-9]+\.[0-9]+(\.[0-9]+)?" | head -1 \
    )
    if [ -z "$package_version" ]; then
        echo "$base_message, but was not found or could not read version" >&2
        return 1
    fi

    # Verify the package version is greater or equal than the minimal version
    # using version sort
    if [ "$package_version" = "$min_version" ]; then
        return 0  # success
    fi
    local older_version=$(
        printf "%s\n" "$package_version" "$min_version" | sort -V | head -1 \
    )
    if [ "$package_version" = "$older_version" ]; then
        echo "$base_message, but found version $package_version for $(which $package)" >&2
        return 1
    fi
    return 0  # success
}