# Some common definitions 
VERBOSE := 
CP      := $(VERBOSE)cp
CPFLAGS := -u
RM	:= $(VERBOSE)rm
RMFLAGS := -rf 
ECHO	:= echo
FIND    := find
GREP    := grep
SED     := sed
GIT     := git
MKDIR   := mkdir
GITPUSH := $(VERBOSE)git push
GITPULL := $(VERBOSE)git pull
GITSTATUS := $(VERBOSE)git status
GITDIFF := $(VERBOSE)git diff
PUSHFLAGS := 
PULLFLAGS := 
STATUSFLAGS := -uno
DIFFFLAGS := --color -w

SHELL	= /BIN/SH

.SILENT :
