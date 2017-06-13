const fetchJsonp = require("fetch-jsonp");
const Observable = require("rxjs/Rx").Observable;
const Tether     = require("tether");
const Velocity   = require("velocity-animate");

// Arrow button key codes
const LEFT  = 37;
const UP    = 38;
const RIGHT = 39;
const DOWN  = 40;

// Utility functions

function createElementWithText(el, text) {
  let textNode = document.createTextNode(text);
  let element  = document.createElement(el);

  element.appendChild(textNode);

  return element;
}

function removeChildrenFrom(element) {
  while(element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function displayDropdown() {
  resultsDropdown.style.display = "block";
  resultsDropdown.style.width   = `${searchInputField.offsetWidth}px`;

  new Tether({
    element: resultsDropdown,
    target: searchInputField,
    attachment: 'top middle',
    targetAttachment: 'bottom middle'
  });
}

function hideDropdown() {
  resultsDropdown.style.display = "none";
}

function buildURL(term) {
  let apiURL = `https://en.wikipedia.org/w/api.php?`;
  let apiAction = `&action=opensearch`;
  let apiFormat = `&json`;
  let apiSearch = `&search=`;
  let apiLimit  = `&limit=5`;

  return apiURL   +
        apiAction +
        apiLimit  +
        apiFormat +
        apiSearch + encodeURIComponent(term);
}

function getWikiSearchResults(term) {
  return Observable.create(function forEach(observer) {
    const url = buildURL(term);

    let cancelled = false;

    fetchJsonp(url)
      .then(resp => resp.json())
      .then(json => {
        if (!cancelled) {
          observer.next(json);
          observer.complete();
        }
      })
      .catch(errv => observer.error())

    return function unsubscribe() {
      cancelled = true;
    }
  });
}

function returnMap (shortest, arrs) {
  return shortest.map(function (item, i) {
    return arrs.map(function (arr) {
      return arr[i];
    });
  });
}

function zip () {
  var arrs = Array.prototype.splice.call(arguments, 0);

  var shortest = arrs.reduce(function (a, b) {
    return a.length < b.length ? a : b;
  });

  return returnMap(shortest, arrs);
}

function buildEmptySet() {
  let textNode = document.createTextNode("No results to display...");
  let element  = document.createElement("p");

  element.classList.add("dropdown-item");
  element.appendChild(textNode);

  return [element];
}

function buildResultSet(results) {
  return results.map(result => {
    let textNode = document.createTextNode(result[0]);
    let element  = document.createElement("a");

    element.classList.add("dropdown-item");
    element.setAttribute("tabindex", "-1");
    element.setAttribute("href", result[1]);

    element.appendChild(textNode);

    return element;
  });
}

function handleKeyboardNavigation(target, active) {
  target.focus();
  target.setAttribute("tabindex", "0");
  active.setAttribute("tabindex", "-1");

  searchInputField.value = target.text;
}

// DOM Elements
let searchBtn         = document.querySelector("#search-toggle");
let searchInputField  = document.querySelector("#search-input");
let searchForm        = document.querySelector("#search-form");
let resultsDropdown   = document.querySelector("#results-dropdown");

// Observables
let searchBtnClicks = Observable.fromEvent(searchBtn, "click");
let inputs          = Observable.fromEvent(searchInputField, "input");
let inputBlurs      = Observable.fromEvent(searchInputField, "blur");
let inputFocuses    = Observable.fromEvent(searchInputField, "focus");
let formBlurs       = Observable.fromEvent(searchForm, "blur");
let formKeypresses  = Observable.fromEvent(searchForm, "keydown");
let dropdownKeypresses = Observable.fromEvent(resultsDropdown, "keydown");

// When the search form opens always do...
let searchFormOpens =
  searchBtnClicks
    .do(() => {
      console.log("Opening form...");

      searchBtn.classList.remove("d-block");  // hide button
      searchForm.classList.add("d-block");    // show form
      searchInputField.focus();               // focus on input
      searchInputField.setAttribute("aria-expanded", "true");
    });


let searchResultSet =
  // Map an opened search form...

  searchFormOpens
    .map(() => {
      // DOM Elements
      let closeBtn = document.querySelector("#close");

      // Observables
      let closeBtnClicks = Observable.fromEvent(closeBtn, "click");

      // When the search form closes always do...
      let searchFormCloses =
        closeBtnClicks
          .do(() => {
            searchBtn.classList.add("d-block");
            searchForm.classList.remove("d-block");
            removeChildrenFrom(resultsDropdown);
          });


      // ...to search results
      return inputs

        // {.'a'.'b'..'c'...'d'...'e'.'f'.........
        .throttleTime(20)

        // {.'a'......................'f'.........
        .map(input => input.target.value.trim())

        // {..'af'....'af'....'afb'...............
        .distinctUntilChanged()

        // {..'af'............'afb'...............
        .map(search => {
          if (search) {
            return getWikiSearchResults(search).retry(3);
          }
          else {
            return Observable.of([]);
          }
        })

        // NOTE
        // The three strategies for flattening a collection of observables are:
        //
        // merge   {...['ardvark', 'abacus']....['abacus']...
        // concat  {...['ardvark', 'abacus']................['abacus']...
        // switch  {............................['abacus']...

        // {..
        // ...{...['ardvark', 'abacus']}  (dispose)
        // ............{...............['abacus']}
        // }
        .switch()

        // Map json data [term, results, descrs, urls]
        .zip(json => [json[1], json[3]])

        // Stop processing events when we close the form
        .takeUntil(searchFormCloses)

    })

    // {......
    // .......{.....['abacus'].....
    .switch()

    // Map the data into html elements
    .map(data => {
      if (data[0] === undefined || data[1] === undefined) {
        return buildEmptySet();
      }

      let results = zip(data[0], data[1]);
      if (!results || results.length === 0) {
        return buildEmptySet()
      }
      else {
        return buildResultSet(results);
      }
    })

    // .............['abacus'].....
    .subscribe({
      next: results => {
        removeChildrenFrom(resultsDropdown);
        results.forEach(node => resultsDropdown.appendChild(node));
        displayDropdown();
      },

      error: e => console.error(e),

      complete: () => console.log("DONE")
    });

inputFocuses
  .subscribe((evt) => {
    if (resultsDropdown.firstElementChild) {
      displayDropdown();
    }
  });

inputBlurs
  .subscribe((evt) => {
    if (!evt.relatedTarget ||
        evt.relatedTarget.className !== "dropdown-item") {
      hideDropdown();
      searchInputField.setAttribute("aria-expanded", "false");
    }
  });

formKeypresses
  .subscribe((evt) => {

    // evt.preventDefault();
    evt.stopPropagation();

    // If we have results...
    if (resultsDropdown.offsetParent !== null) {

      if (evt.key !== "ArrowDown" && evt.key !== "ArrowUp") return;

      let activeElement = document.activeElement;

      // programmatically apply focus to the new element,
      // update the tabindex of the focused element to "0", and
      // update the tabindex of the previously focused element to "-1".
      if (searchInputField === activeElement) {
        handleKeyboardNavigation(resultsDropdown.firstChild, activeElement);
      }
    }
  });

dropdownKeypresses
  .subscribe(evt => {

    evt.preventDefault();
    evt.stopPropagation();

    let sibling = null;
    let activeElement = document.activeElement;

    switch (evt.key) {
      case "ArrowDown":
        sibling = evt.target.nextElementSibling;
        if (!sibling) {
          sibling = resultsDropdown.firstChild;
        }

        break;

      case "ArrowUp":
        sibling = evt.target.previousElementSibling;
        if (!sibling) {
          sibling = resultsDropdown.lastChild;
        }

        break;

      case "Enter":
        window.location = evt.target.getAttribute("href");

        break;

      default:

    }

    if (sibling && activeElement) {
      handleKeyboardNavigation(sibling, activeElement);
    }
  });
