include Makefile.inc

DST_DIR := src
SRC_DIR := host

PACKAGE_SOURCES := $(SRC_DIR)/state/finite-state-machine.ts 

PACKAGE_TARGETS := $(subst $(SRC_DIR),$(DST_DIR),$(PACKAGE_SOURCES))

# rules

$(DST_DIR)/state/%.ts: $(SRC_DIR)/state/%.ts
	$(ECHO) Making a file $@ from $<
	$(MKDIR) -p $(dir $@)
	$(CP) $(CPFlALGS) $< $@

prepare_dir:
	echo "Preparing directory ..."
#	rm -rf $(DST_DIR)
	echo "Generating src ..."

$(PACKAGE_TARGETS): | prepare_dir

publish: $(PACKAGE_TARGETS)

test:
	echo $(PACKAGE_SOURCES)
	echo $(PACKAGE_TARGETS)


