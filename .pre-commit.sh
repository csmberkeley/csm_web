#!/usr/bin/env bash
set -u
staged_files=$(mktemp)
reformatted_files=$(mktemp)
# Look only at staged files that have been modified, renamed, or newly added
git diff --cached --name-only --diff-filter=MRA > "$staged_files"

javascript_files=$(grep -E -e '.*/src/.*\.jsx?$' -e 'webpack\.config\.js$' "$staged_files" | tr '\n' ' ' | sed 's/ *$//')
json_files=$(grep -E '\.json$' "$staged_files" | tr '\n' ' ' | sed 's/ *$//')

if [ -n "$javascript_files" ]
then
	npx eslint --quiet $javascript_files || exit 1
	npx prettier --write --list-different $javascript_files >> "$reformatted_files"
fi

if [ -n "$json_files" ]
then
	npx prettier --write --list-different $json_files >> "$reformatted_files"
fi

python_files=$(grep '\.py$' "$staged_files" | tr '\n' ' ' | sed 's/ *$//')
if [ -n "$python_files" ]
then
	# Get filenames of python files that would be reformated
	pycodestyle --max-line-length 120 --format '%(path)s' $python_files | sort | uniq >> "$reformatted_files"
	autopep8 --max-line-length 120 -i $python_files
fi

if [ -s "$reformatted_files" ]
then
	echo -e "\033[32mReformatted:\033[0m\n$(cat $reformatted_files)\n"
	xargs git add < "$reformatted_files"
fi

rm "$staged_files"
rm "$reformatted_files"
