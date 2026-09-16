# SPDX-License-Identifier: MIT
#
# Tower backend: subscription parser + client config generator.

include $(TOPDIR)/rules.mk

PKG_NAME:=tower
PKG_VERSION:=0.1.0
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/kenzok8/luci-app-tower.git
PKG_SOURCE_VERSION:=$(PKG_VERSION)
PKG_MIRROR_HASH:=skip

PKG_LICENSE:=MIT
PKG_MAINTAINER:=kenzok8 <kenzok8@gmail.com>

PKG_BUILD_DEPENDS:=golang/host
PKG_BUILD_PARALLEL:=1
PKG_BUILD_FLAGS:=no-mips16

GO_PKG:=github.com/kenzok8/tower
GO_PKG_BUILD_PKG:=$(GO_PKG)/cmd/tower

include $(INCLUDE_DIR)/package.mk
include $(TOPDIR)/feeds/packages/lang/golang/golang-package.mk

define Package/tower
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Web Servers/Proxies
  TITLE:=Tower subscription parser and config generator
  URL:=https://github.com/kenzok8/luci-app-tower
  DEPENDS:=+ca-bundle
endef

define Package/tower/description
  Tower parses airport subscriptions, manages nodes locally, and generates
  Surge / Clash / Shadowrocket / sing-box configurations.
endef

define Package/tower/conffiles
/etc/config/tower
/etc/tower/
endef

define Package/tower/install
	$(call GoPackage/Package/Install/Bin,$(1))
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/tower.init $(1)/etc/init.d/tower
endef

$(eval $(call GoPackage,$(PKG_NAME)))
$(eval $(call BuildPackage,$(PKG_NAME)))
