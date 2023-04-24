var picinjection = {
  _fit: function (pic, target) {
    var p = pic,
      t = target;

    var t_ratio = t.x / t.y;
    var p_ratio = p.width / p.height;
    if (t_ratio > p_ratio) {
      var rotate = this._rotate;
      rotate(pic);
      rotate(target);
      var result = this._fit(pic, target);
      rotate(pic);
      rotate(target);
      rotate(result);
      return result;
    }

    p.left = 0;
    p.right = 0;
    p.top = 0;
    p.bottom = 0;

    // Step 1: Calculate |crop_x|: total horizontal crop needed.
    var crop_max = Math.max(p.left + p.right, 0.001);
    // Crop as much as we must, but not past the max allowed crop.
    var crop_x = Math.min(p.width - p.height * t_ratio, crop_max);

    var crop_left = p.left * (crop_x / crop_max);

    var scale = t.x / (p.width - crop_x);

    var result = {};
    result.x = Math.round(p.width * scale);
    result.y = Math.round(p.height * scale);
    result.left = Math.round(crop_left * scale);
    result.width = Math.round(t.x);
    result.height = Math.round(result.y);

    result.offsettop = Math.round((t.y - result.height) / 2);

    result.top = 0;
    result.offsetleft = 0;
    return result;
  },

  // Rotate a picture/target about its NW<->SE axis.
  _rotate: function (o) {
    var pairs = [
      ["x", "y"],
      ["top", "left"],
      ["bot", "right"],
      ["offsettop", "offsetleft"],
      ["width", "height"],
    ];
    pairs.forEach(function (pair) {
      var a = pair[0],
        b = pair[1],
        tmp;
      if (o[a] || o[b]) {
        tmp = o[b];
        o[b] = o[a];
        o[a] = tmp; // swap
      }
    });
  },

  _dim: function (el, prop) {
    function intFor(val) {
      // Match two or more digits; treat < 10 as missing.  This lets us set
      // dims that look good for e.g. 1px tall ad holders (cnn.com footer.)
      var match = (val || "").match(/^([1-9][0-9]+)(px)?$/);
      if (!match) {
        return undefined;
      }

      return parseInt(match[1]);
    }

    // "getAttribute" property of an element might be undefined,
    // see github:CatBlock/catblock#65
    if (typeof el.getAttribute !== "function") {
      return intFor(window.getComputedStyle(el)[prop]);
    } else {
      return intFor(el.getAttribute(prop) || window.getComputedStyle(el)[prop]);
    }
  },

  _parentDim: function (el, prop) {
    // Special hack for Facebook, so Sponsored links are huge and beautiful
    // pictures instead of tiny or missing.
    if (/facebook/.test(document.location.href)) {
      return undefined;
    }
    var result = undefined;
    while (!result && el.parentNode) {
      result = this._dim(el.parentNode, prop);
      el = el.parentNode;
    }
    return result;
  },

  _targetSize: function (el) {
    var t = { x: this._dim(el, "width"), y: this._dim(el, "height") };

    // Make it rectangular if ratio is appropriate, or if we only know one dim
    // and it's so big that the 180k pixel max will force the pic to be skinny.
    if (t.x && !t.y && t.x > 400) {
      t.type = "wide";
    } else if (t.y && !t.x && t.y > 400) {
      t.type = "tall";
    } else if (Math.max(t.x, t.y) / Math.min(t.x, t.y) >= 2) {
      // false unless (t.x && t.y)
      t.type = t.x > t.y ? "wide" : "tall";
    }

    if (!t.type) {
      // we didn't choose wide/tall
      t.type = (t.x || t.y) > 125 ? "big" : "small";
    }

    return t;
  },

  // Call callbock with placement details for |el|, or with undefined if we don't
  // have enough info.
  _getPlacementFor: function (el, callback) {
    var that = this;
    var t = this._targetSize(el);

    BGcall("randomListing", { width: t.x, height: t.y }, function (pic) {
      if (!pic) {
        callback();
        return;
      }
      // If we only have one dimension, we may choose to use the picture's ratio;
      // but don't go over 180k pixels (so e.g. 1000x__ doesn't insert a 1000x1000
      // picture (cnn.com)).  And if an ancestor has a size, don't exceed that.
      var max = 180000;
      if (t.x && !t.y) {
        var newY = Math.round(
          Math.min((pic.height * t.x) / pic.width, max / t.x)
        );
        var parentY = that._parentDim(el, "height");
        t.y = parentY ? Math.min(newY, parentY) : newY;
      }
      if (t.y && !t.x) {
        var newX = Math.round(
          Math.min((pic.width * t.y) / pic.height, max / t.y)
        );
        var parentX = that._parentDim(el, "width");
        t.x = parentX ? Math.min(newX, parentX) : newX;
      }
      if (!t.x || !t.y || t.x < 40 || t.y < 40) {
        callback();
        return; // unknown dims or too small to bother
      }

      var result = that._fit(pic, t);
      result.url = pic.url;
      result.attribution_url = pic.attribution_url;
      result.photo_title = pic.title;

      callback(result);
    });
  },

  // Given a target element, augment it with a picture if possible.
  // Calls callback when finished.

  _augment: function (el, callback) {
    var that = this;

    this.enabled(function (enabled) {
      if (!enabled) {
        callback();
        return;
      }

      chrome.storage.sync.get({ list1: [] }, function (val) {
        if (val.list1.length === 0) {
          console.log("YOOOOOOOOOOO");
          let tasksList = [
            { ad: "Stop Doomscrolling", emoji: "📵" },
            { ad: "Buy less stuff", emoji: "⛔" },
            { ad: "Breathe through your nose", emoji: "👃" },
            { ad: "Go to bed early", emoji: "🛌" },
            { ad: "Eat better food", emoji: "🍲" },
            { ad: "Touch Grass", emoji: "🌻" },
            { ad: "Less social media", emoji: "🐦" },
            { ad: "Go Outside", emoji: "🌳" },
            { ad: "Sit Up Straight", emoji: "🪑" },
            { ad: "Take a Break", emoji: "⏰" },
            { ad: "You are wasting your life", emoji: "💀" },
          ];
          chrome.storage.sync.set({ list1: tasksList });

          // for (var i = 0; i < tasksList.length; i++) {
          //   addListItem(tasksList[i]);
          // }
        }
        // console.log("val.list1 :" + val.list1);
        that._getPlacementFor(el, function (placement) {
          if (!placement) {
            callback();
            return;
          }

          //create div
          var newPic = document.createElement("div");

          newPic.classList.add("picinjection-image");

          let messages = val.list1;

          let adColors = [
            {
              color: "black",
              backgroundColor: "#FFFFAD",
              backgroundImage:
                "repeating-radial-gradient( circle at 0 0, transparent 0, #FFFFAD 10px ), repeating-linear-gradient( #e600c655, #e600c6 )",
            },
            {
              color: "white",
              backgroundColor: "#FFFFAD",
              backgroundImage:
                "repeating-radial-gradient( circle at 0 0, transparent 0, #FFFFAD 10px ), repeating-linear-gradient( #E5012455, #E50124 )",
            },
            {
              color: "white",
              backgroundColor: "#FFFFAD",
              backgroundImage:
                "radial-gradient(circle at center center, #E50124, #FFFFAD), repeating-radial-gradient(circle at center center, #E50124, #E50124, 10px, transparent 20px, transparent 10px)",
            },
            {
              color: "white",
              backgroundColor: "#99ecff",
              backgroundImage:
                "radial-gradient(at 28% 45%, hsla(177,60%,75%,1) 0px, transparent 50%),\nradial-gradient(at 73% 64%, hsla(233,71%,63%,1) 0px, transparent 50%),\nradial-gradient(at 33% 54%, hsla(41,83%,75%,1) 0px, transparent 50%),\nradial-gradient(at 25% 97%, hsla(273,73%,75%,1) 0px, transparent 50%),\nradial-gradient(at 36% 7%, hsla(37,88%,67%,1) 0px, transparent 50%),\nradial-gradient(at 71% 10%, hsla(234,88%,60%,1) 0px, transparent 50%),\nradial-gradient(at 97% 38%, hsla(271,96%,72%,1) 0px, transparent 50%)",
            },
            {
              color: "white",
              backgroundColor: "#ff99bd",
              backgroundImage:
                "radial-gradient(at 87% 28%, hsla(258,76%,62%,1) 0px, transparent 50%),\nradial-gradient(at 97% 94%, hsla(23,71%,61%,1) 0px, transparent 50%),\nradial-gradient(at 85% 79%, hsla(356,67%,77%,1) 0px, transparent 50%),\nradial-gradient(at 95% 79%, hsla(343,63%,73%,1) 0px, transparent 50%),\nradial-gradient(at 94% 35%, hsla(121,99%,74%,1) 0px, transparent 50%),\nradial-gradient(at 19% 11%, hsla(200,89%,72%,1) 0px, transparent 50%),\nradial-gradient(at 6% 56%, hsla(116,72%,70%,1) 0px, transparent 50%)",
            },
            {
              backgroundImage:
                "linear-gradient(135deg, #0854a8 25%, transparent 25%), linear-gradient(225deg, #0854a8 25%, transparent 25%), linear-gradient(45deg, #0854a8 25%, transparent 25%), linear-gradient(315deg, #0854a8 25%, #4f27a1 25%)",
              backgroundColor: "#4f27a1",
              backgroundSize: "21px 21px",
              color: "white",
            },
            {
              backgroundImage: "linear-gradient(#FF4E50, #F9D423)",
              color: "white",
            },
            {
              backgroundImage: "linear-gradient(#FBD3E9, #BB377D)",
              color: "white",
            },
            {
              backgroundImage: "linear-gradient(#B993D6, #8CA6DB)",
              color: "white",
            },
            {
              backgroundImage: "linear-gradient(#00d2ff, #3a7bd5)",
              color: "white",
            },
            {
              backgroundImage: "linear-gradient(#f2709c, #ff9472)",
              color: "white",
            },
            {
              backgroundImage: "linear-gradient(#ddd6f3, #faaca8)",
              color: "white",
            },
            {
              backgroundColor: "red",
              color: "black",
              backgroundImage:
                "repeating-radial-gradient( circle at 0 0, transparent 0, #e5e5f7 10px ), repeating-linear-gradient( #444cf755, #444cf7 )",
              backgroundSize: "",
            },
            {
              backgroundColor: "#ff7a59",
              color: "white",
              backgroundImage:
                "radial-gradient(circle at center center, #f7e345, #e5e5f7), repeating-radial-gradient(circle at center center, #f7e345, #f7e345, 10px, transparent 20px, transparent 10px)",
              backgroundSize: "",
            },
            {
              backgroundColor: "#5340ff",
              color: "white",
              backgroundImage:
                "radial-gradient(circle, transparent 20%, #e5e5f7 20%, #e5e5f7 80%, transparent 80%, transparent), radial-gradient(circle, transparent 20%, #e5e5f7 20%, #e5e5f7 80%, transparent 80%, transparent) 25px 25px, linear-gradient(#f74545 2px, transparent 2px) 0 -1px, linear-gradient(90deg, #f74545 2px, #e5e5f7 2px) -1px 0",
              backgroundSize: "50px 50px, 50px 50px, 25px 25px, 25px 25px",
            },
            {
              backgroundColor: "#f037a5",
              color: "black",
              backgroundImage:
                "radial-gradient( ellipse farthest-corner at 33px 33px , #f74545, #f74545 50%, #e5e5f7 50%)",
              backgroundSize: "33px 33px",
            },
            {
              color: "white",
              backgroundColor: "#1a3270",
              backgroundImage:
                "radial-gradient( ellipse farthest-corner at 23px 23px , #4b45f7, #4b45f7 50%, #1a3270 50%)",
              backgroundSize: "23px 23px",
            },
            {
              backgroundColor: "#e5e5f7",
              color: "black",
              background:
                "radial-gradient(circle, transparent 20%, #e5e5f7 20%, #e5e5f7 80%, transparent 80%, transparent), radial-gradient(circle, transparent 20%, #e5e5f7 20%, #e5e5f7 80%, transparent 80%, transparent) 42.5px 42.5px, linear-gradient(#f7456c 3.4000000000000004px, transparent 3.4000000000000004px) 0 -1.7000000000000002px, linear-gradient(90deg, #f7456c 3.4000000000000004px, #e5e5f7 3.4000000000000004px) -1.7000000000000002px 0",
              backgroundSize:
                "85px 85px, 85px 85px, 42.5px 42.5px, 42.5px 42.5px",
            },
            {
              backgroundColor: "#e5e5f7",
              color: "black",
              backgroundImage:
                "radial-gradient(circle at center center, #f7456c, #e5e5f7), repeating-radial-gradient(circle at center center, #f7456c, #f7456c, 17px, transparent 34px, transparent 17px)",
            },
            {
              color: "white",
              backgroundColor: "#e5e5f7",
              backgroundImage:
                "radial-gradient(circle at center center, #444cf7, #e5e5f7), repeating-radial-gradient(circle at center center, #444cf7, #444cf7, 10px, transparent 20px, transparent 10px)",
            },
            {
              backgroundColor: "#f037a5",
              color: "black",
            },
            {
              backgroundColor: "#d9552a",
              color: "white",
            },
            {
              backgroundColor: "#362c50",
              color: "#d9552a",
            },
            {
              backgroundColor: "#d1aec5",
              color: "#d9552a",
            },
            {
              backgroundColor: "black",
              color: "red",
            },
            {
              backgroundColor: "black",
              color: "red",
            },
            {
              backgroundColor: "black",
              color: "#F2A50A",
            },
            {
              backgroundColor: "black",
              color: "red",
            },
            {
              backgroundColor: "black",
              color: "white",
            },
            {
              backgroundColor: "#F2A50A",
              color: "black",
            },
            {
              backgroundColor: "black",
              color: "white",
            },
            {
              backgroundColor: "  #171717",
              color: "#3D81CC",
            },
            {
              backgroundColor: "  #171717",
              color: "#F9B804",
            },
            {
              backgroundColor: "  #2F55E6",
              color: "#F9B804",
            },
            {
              backgroundColor: "  #FFFFAD",
              color: "#E50124",
            },
            {
              backgroundColor: "  #fec031",
              color: "#84c1e2",
            },
            {
              backgroundColor: "  #e5332a",
              color: "white",
            },
            {
              backgroundColor: "  #e5332a",
              color: "white",
            },
            {
              backgroundColor: "  #4f9bc4",
              color: "#9ccef5",
            },
            {
              backgroundColor: "  #feeaef",
              color: "#1c0950",
            },
          ];
          const randomMessagesIndex = Math.floor(
            Math.random() * messages.length
          );
          const randomColorIndex = Math.floor(Math.random() * adColors.length);
          var newDiv = document.createElement("div");
          newPic.appendChild(newDiv);

          var tag = document.createElement("p");

          var text = document.createTextNode(messages[randomMessagesIndex].ad);
          tag.appendChild(text);
          newDiv.appendChild(tag);

          var emojiTag = document.createElement("p");
          var emojiText = document.createTextNode(
            messages[randomMessagesIndex].emoji
          );
          emojiTag.appendChild(emojiText);
          newDiv.appendChild(emojiTag);

          let spacerWidth = placement.width / 10;
          let spacerheight = placement.height / 10;
          var css = {
            // fontWeight: "bold",
            // fontFamily:
            //   "-apple-system, BlinkMacSystemFont, Segoe UI Roboto, Helvetica, Arial, sans-serif",
            fontSize: spacerWidth + "px",
            width: placement.width - spacerWidth + "px",
            height: placement.height - spacerheight + "px",
            // backgroundColor: adColors[randomColorIndex].background,

            //   background: "url(" + placement.url + ") no-repeat",
            //   backgroundPosition:
            //     "-" + placement.left + "px -" + placement.top + "px",
            //   backgroundSize: placement.x + "px " + placement.y + "px",
            margin: placement.offsettop + "px " + placement.offsetleft + "px",
            // nytimes.com float:right ad at top is on the left without this
            float: window.getComputedStyle(el).float || undefined,

            // backgroundColor: adColors[randomColorIndex].backgroundColor,
            // color: adColors[randomColorIndex].color,
          };
          var css2 = {
            // margin: placement.offsettop + "px " + placement.offsetleft + "px",
            // nytimes.com float:right ad at top is on the left without this
            // float: window.getComputedStyle(el).float || undefined,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: placement.width - spacerWidth + "px",
            height: placement.height - spacerheight + "px",
            fontWeight: "bold",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, Segoe UI Roboto, Helvetica, Arial, sans-serif",
            fontSize: placement.width / 12 + "px",
          };
          css2.backgroundColor = adColors[randomColorIndex].backgroundColor;
          css2.color = adColors[randomColorIndex].color;

          if (adColors[randomColorIndex].backgroundImage != "") {
            css2.backgroundImage = adColors[randomColorIndex].backgroundImage;
          }

          if (adColors[randomColorIndex].backgroundSize != "") {
            css2.backgroundSize = adColors[randomColorIndex].backgroundSize;
          }
          for (var k in css) {
            newPic.style[k] = css[k];
          }
          for (var j in css2) {
            newDiv.style[j] = css2[j];
          }

          // hotmail ad is position:absolute; we must match its placement.
          // battefield.play4free.net imgs are absolute; ad is not img. match it.
          // reddit homepage sometimes gets a whole screenful of white if
          // inserted <img> is inline instead of block like what it augments.
          for (var k in {
            position: 1,
            left: 1,
            top: 1,
            bottom: 1,
            right: 1,
            display: 1,
          }) {
            newPic.style[k] = window.getComputedStyle(el)[k];
          }

          // that._addInfoCardTo(newPic, placement);

          el.dataset.picinjectionaugmented = "true";
          el.parentNode.insertBefore(newPic, el);

          callback();
        });
      });
    });
  },

  // Add an info card to |newPic| that appears on hover.

  _addInfoCardTo: function (newPic, placement) {
    if (newPic.infoCard) {
      return;
    }
  },

  // Returns true if |el| or an ancestor was hidden by an AdBlock hiding rule.
  _inHiddenSection: function (el) {
    return window.getComputedStyle(el).orphans === "4321";
  },

  // Find the ancestor of el that was hidden by AdBlock, and augment it
  // with a picture.  Assumes _inHiddenSection(el) is true.
  _augmentHiddenSectionContaining: function (el) {
    // Find the top hidden node (the one AdBlock originally hid)
    while (this._inHiddenSection(el.parentNode)) {
      el = el.parentNode;
    }

    this._forceToOriginalSizeAndAugment(el, "block");
  },

  augmentBlockedElIfRightType: function (el) {
    if (el.nodeName in { IMG: 1, IFRAME: 1, OBJECT: 1, EMBED: 1 }) {
      picinjection._forceToOriginalSizeAndAugment(el, "");
    }
  },

  _forceToOriginalSizeAndAugment: function (el, displayValue) {
    // We may have already augmented this element...
    if (el.dataset.picinjectionaugmented) {
      return;
    }

    var oldCssText = el.style.cssText;
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("display", displayValue, "important");
    var size = el.style.backgroundPosition.match(/^(\w+) (\w+)$/);
    if (size) {
      // Restore el.width&el.height to whatever they were before AdBlock.
      var dims = { width: size[1], height: size[2] };
      for (var dim in dims) {
        if (dims[dim] === "-1px") {
          el.removeAttribute(dim);
        } else {
          el.setAttribute(dim, dims[dim]);
        }
      }
    }

    this._augment(el, function () {
      el.style.cssText = oldCssText; // Re-hide the section
      var addedImgs = document.getElementsByClassName("picinjection-image");
      for (var i = 0; i < addedImgs.length; i++) {
        var displayVal = window.getComputedStyle(addedImgs[i]).display;
        if (displayVal === "none") {
          addedImgs[i].style.display = "";
        }
      }
    });
  },

  // translate: function (key) {
  //   var text = {
  //     explanation: {
  //       en: "AdBlock now shows you cats instead of ads!",
  //       es: "AdBlock ahora muestra los gatos en lugar de anuncios!",
  //       fr: "Dorénavant AdBlock affichera des chats à la place des publicités!",
  //       de: "AdBlock ersetzt ab heute Werbung durch Katzen!",
  //       ru: "AdBlock теперь отображает котов вместо рекламы!",
  //       nl: "AdBlock toont je nu katten in plaats van advertenties!",
  //       zh: "现在显示的AdBlock猫，而不是广告！",
  //     },
  //     stop_showing: {
  //       en: "Stop showing me cats!",
  //       es: "No mostrar los gatos!",
  //       fr: "Arrêter l'affichage des chats!",
  //       de: "Keine Katzen mehr anzeigen!",
  //       ru: "Не показывать кошек!",
  //       nl: "Toon geen katten meer!",
  //       zh: "不显示猫图片！",
  //     },
  //     ok_no_more: {
  //       en: "OK, AdBlock will not show you any more cats.\n\nHappy April Fools' Day!",
  //       es: "OK, AdBlock no te mostrará los gatos.\n\nFeliz Día de los Inocentes!",
  //       fr: "OK, AdBlock n'affichera plus de chats.\n\nJ'espère que mon poisson d'avril vous a plu!",
  //       de: "AdBlock wird keine Katzen mehr anzeigen.\n\nApril, April!",
  //       ru: "Хорошо, AdBlock не будет отображаться кошек.\n\nЕсть счастливый День дурака",
  //       nl: "1 April!!\n\nAdBlock zal vanaf nu geen katten meer tonen.",
  //       zh: "OK，的AdBlock不会显示猫。\n\n幸福四月愚人节！",
  //     },
  //     new: {
  //       en: "New!",
  //       es: "Nuevo!",
  //       fr: "Nouveau!",
  //       de: "Neu!",
  //       ru: "новое!",
  //       nl: "Nieuw!",
  //       zh: "新！",
  //     },
  //     enable_picinjection: {
  //       en: "Display a pretty picture in place of ads.",
  //       es: "Mostrar una foto bonita en lugar de anuncios.",
  //       fr: "Afficher des belles images à la place des publicités.",
  //       de: "Werbung durch schöne Bilder ersetzen.",
  //       ru: "Показать красивую картинку вместо объявления.",
  //       nl: "Toon een leuke afbeelding op de plaats waar advertenties stonden.",
  //       zh: "显示漂亮的照片，而不是广告。",
  //     },
  //     learn_more: {
  //       en: "Learn more",
  //       es: "Más información",
  //       fr: "En savoir plus",
  //       de: "Mehr Informationen",
  //       ru: "Подробнее",
  //       nl: "Meer informatie",
  //       zh: "了解更多信息",
  //     },
  //     the_url: {
  //       // don't translate into other locales
  //       en: "https://chromeadblock.com/catblock/",
  //     },
  //   };
  //   var locale = determineUserLanguage();
  //   var msg = "Manipulate yourself";
  //   return msg[locale] || msg.en;
  // },

  enabled: function (callback) {
    BGcall("get_settings", function (settings) {
      callback(settings.catblock);
    });
  },
}; // end picinjection

// Augmentation code, which replaces blocked and hidden ads
// with cats or anything else
if (!SAFARI) {
  // Augment blocked ads on Blink-based browsers => images/subdocuments/objects
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (
      request.command !== "purge-elements" ||
      request.frameUrl !== document.location.href
    ) {
      return;
    }

    var ads = document.querySelectorAll(request.selector);

    for (var i = 0; i < ads.length; i++) {
      picinjection.augmentBlockedElIfRightType(ads[i]);
    }

    sendResponse(true);
  });

  // Augment hidden ads on Blink-based browsers
  function augmentHiddenElements(selector) {
    var ads = document.querySelectorAll(selector);

    for (var i = 0; i < ads.length; i++) {
      picinjection._augmentHiddenSectionContaining(ads[i]);
    }
  }
} else {
  // Augment blocked and hidden ads on Safari
  document.addEventListener(
    "beforeload",
    function (event) {
      if (picinjection._inHiddenSection(event.target)) {
        picinjection._augmentHiddenSectionContaining(event.target);
      }
    },
    true
  );
}
