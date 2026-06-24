---
layout: post.njk
title: "Melwood's bovine testing solutions"
thumbnail: "/archive/ul/bovinetesting/1.jpg"
instagram_url: "https://www.instagram.com/p/DXsEBbRDK-v/" # Link to IG
author: "Uncompromised Liberation"
tags: ["dog comparisons", "elwoods"]
---

{% for i in (1..1) %}
  {% capture imgPath %}archive/ul/bovinetesting/{{ i }}{% endcapture %}
  {% capture imgAlt %}Slide {{ i }}{% endcapture %}
  {% image imgPath imgAlt %}
{% endfor %}
