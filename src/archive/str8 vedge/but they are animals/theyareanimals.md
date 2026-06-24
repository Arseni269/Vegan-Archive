---
layout: post.njk
title: "But they're animals, not humans"
thumbnail: "/archive/str8 vedge/but they are animals/1.webp"
instagram_url: "https://www.instagram.com/p/DLagOYXsm29/?img_index=1" # Link to IG
author: "Str8 Vedge"
tags: ["excuses"]
---

{% for i in (1..4) %}
  {% capture imgPath %}archive/str8 vedge/but they are animals/{{ i }}{% endcapture %}
  {% capture imgAlt %}Slide {{ i }}{% endcapture %}
  {% image imgPath imgAlt %}
{% endfor %}

Yes, they're not humans, so what?