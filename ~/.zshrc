function parse_git_branch() {
  git branch 2> /dev/null | sed -n -e 's/^\* \(.*\)/(\1)/p'
}
COLOR_DEF=$'%f'
COLOR_USR=$'%F{243}'
COLOR_DIR=$'%F{197}'
COLOR_GIT=$'%F{39}'
export PROMPT='${COLOR_USR}%n ${COLOR_DIR}%~ ${COLOR_GIT}$(parse_git_branch)${COLOR_DEF} $ '

# Added by Antigravity
export PATH="/Users/abbey/.antigravity/antigravity/bin:$PATH"
