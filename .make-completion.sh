# Bash completion for Makefile targets
# Add to ~/.bashrc: source /path/to/.make-completion.sh

_make_completion() {
    local cur prev targets
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    if [ -f Makefile ]; then
        targets=$(make -qp | awk -F':' '/^[a-zA-Z0-9][^$#\/\t=]*:([^=]|$)/ {split($1,A,/ /);for(i in A)print A[i]}' | sort -u)
        COMPREPLY=( $(compgen -W "${targets}" -- ${cur}) )
    fi
    
    return 0
}

complete -F _make_completion make
