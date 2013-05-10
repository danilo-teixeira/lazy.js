describe("Lazy", function() {
  var people,
      david,
      mary,
      lauren,
      adam,
      daniel,
      happy;

  beforeEach(function() {
    people = [
      david  = new Person("David", 63, "M"),
      mary   = new Person("Mary", 62, "F"),
      lauren = new Person("Lauren", 32, "F"),
      adam   = new Person("Adam", 30, "M"),
      daniel = new Person("Daniel", 28, "M"),
      happy  = new Person("Happy", 25, "F")
    ];

    Person.reset(people);
  });

  function ensureLaziness(action) {
    it("doesn't eagerly iterate the collection", function() {
      action();
      expect(Person.accesses).toEqual(0);
    });
  }

  describe("generate", function() {
    it("allows generation of arbitrary sequences", function() {
      var sequence = Lazy.generate(function(i) { return i; })
        .drop(1)
        .take(3)
        .toArray();

      expect(sequence).toEqual([1, 2, 3]);
    });

    it("can be iterated just like any other sequence", function() {
      var randomNumbers = Lazy.generate(function(i) { return Math.random(); });

      // Iterate over the numbers until there's a number > 0.5.
      randomNumbers.each(function(x) {
        if (x > 0.5) {
          return false;
        }
      });
    });

    it("provides 'random access'", function() {
      var naturalNumbers = Lazy.generate(function(i) { return i + 1; });
      expect(naturalNumbers.get(9)).toEqual(10);
    });

    it("throws an exception if you try to get its length", function() {
      var naturalNumbers = Lazy.generate(function(i) { return i + 1; });
      expect(function() { naturalNumbers.length(); }).toThrow();
    });
  });

  describe("map", function() {
    ensureLaziness(function() { Lazy(people).map(Person.getName); });

    it("maps the collection using a mapper function", function() {
      var names = Lazy(people).map(Person.getName).toArray();

      expect(names).toEqual([
        "David",
        "Mary",
        "Lauren",
        "Adam",
        "Daniel",
        "Happy"
      ]);
    });

    it("provides indexed access into the collection", function() {
      var lastName = Lazy(people).map(Person.getName).get(people.length - 1);
      expect(lastName).toEqual("Happy");
    });

    it("does not require iteration to index into the collection", function() {
      var lastName = Lazy(people).map(Person.getName).get(people.length - 1);
      expect(Person.objectsTouched).toEqual(1);
    });
  });

  describe("filter", function() {
    ensureLaziness(function() { Lazy(people).filter(Person.isMale); });
    
    it("selects values from the collection using a selector function", function() {
      var boys = Lazy(people).filter(Person.isMale).toArray();
      expect(boys).toEqual([david, adam, daniel]);
    });

    it("combines with previous filters", function() {
      var sons = Lazy(people)
        .filter(Person.isMale)
        .filter(function(p) { return p.getName() !== "David"; })
        .toArray();
      expect(sons).toEqual([adam, daniel]);
    });
  });

  describe("reject", function() {
    ensureLaziness(function() { Lazy(people).reject(Person.isMale); });

    it("does the opposite of filter", function() {
      var girls = Lazy(people).reject(Person.isMale).toArray();
      expect(girls).toEqual([mary, lauren, happy]);
    });
  });

  describe("reverse", function() {
    ensureLaziness(function() { Lazy(people).reverse(); });

    it("iterates the collection backwards", function() {
      var reversed = Lazy(people).reverse().toArray();

      expect(reversed).toEqual([
        happy,
        daniel,
        adam,
        lauren,
        mary,
        david
      ]);
    });

    it("provides indexed access into the collection", function() {
      var lastPerson = Lazy(people).reverse().get(0);
      expect(lastPerson).toEqual(happy);
    });

    it("does not create an array to index into the collection", function() {
      var reversed = Lazy(people).reverse();
      var lastPerson = reversed.get(0);
      expect(reversed.arrayCount()).toEqual(0);
    });
  });

  describe("take", function() {
    ensureLaziness(function() { Lazy(people).take(2); });

    it("only selects the first N elements from the collection", function() {
      var firstTwo = Lazy(people).take(2).toArray();
      expect(firstTwo).toEqual([david, mary]);
    });
  });

  describe("drop", function() {
    ensureLaziness(function() { Lazy(people).drop(2); });

    it("skips the first N elements from the collection", function() {
      var children = Lazy(people).drop(2).toArray();
      expect(children).toEqual([lauren, adam, daniel, happy]);
    });
  });

  describe("sortBy", function() {
    ensureLaziness(function() { Lazy(people).sortBy(Person.getAge); });

    it("sorts the result by the specified selector", function() {
      var peopleByName = Lazy(people).sortBy(Person.getName).toArray();
      expect(peopleByName).toEqual([adam, daniel, david, happy, lauren, mary]);
    });
  });

  describe("uniq", function() {
    ensureLaziness(function() { Lazy(people).map(Person.getGender).uniq(); });

    it("only returns 1 of each unique value", function() {
      var genders = Lazy(people).map(Person.getGender).uniq().toArray();
      expect(genders).toEqual(["M", "F"]);
    });
  });

  describe("chaining methods together", function() {
    ensureLaziness(function() {
      Lazy(people)
        .filter(Person.isFemale)
        .map(Person.getName)
        .reverse()
        .drop(1)
        .take(2)
        .uniq();
    });

    it("applies the effects of all chained methods", function() {
      var girlNames = Lazy(people)
        .filter(Person.isFemale)
        .map(Person.getName)
        .reverse()
        .drop(1)
        .take(2)
        .uniq()
        .toArray();

      expect(girlNames).toEqual(["Lauren", "Mary"]);
    });

    describe("filter -> take", function() {
      it("only ever touches as many objects as necessary", function() {
        var firstMale = Lazy(people)
          .filter(Person.isMale)
          .map(Person.getGender)
          .take(1)
          .toArray();

        expect(firstMale).toEqual(["M"]);
        expect(Person.objectsTouched).toEqual(1);
      });
    });

    describe("take -> map", function() {
      it("maps the items taken (just making sure)", function() {
        var firstTwoGenders = Lazy(people)
          .take(2)
          .map(Person.getGender)
          .toArray();

        expect(firstTwoGenders).toEqual(["M", "F"]);
      });
    });

    describe("map -> map -> map", function() {
      function getAgeGroup(age) {
        return age < 50 ? "young" : "old";
      }

      function getFirstLetter(str) {
        return str.charAt(0);
      }

      it("only creates one array from the combination of maps", function() {
        var ages = Lazy(people)
          .map(Person.getAge)
          .map(getAgeGroup)
          .map(getFirstLetter);

        ages.toArray();

        expect(ages.arrayCount()).toEqual(1);
      });
    });
  });

  describe("compared to underscore", function() {
    function createArray(size) {
      var array = [];
      for (var i = 1; i <= size; ++i) {
        array.push(i);
      }
      return array;
    }

    function inc(x) { return x + 1; }
    function dec(x) { return x - 1; }
    function square(x) { return x * x; }
    function isEven(x) { return x % 2 === 0; }

    var arr = createArray(1000);

    compareToUnderscore("map", {
      lazy: function() { return Lazy(arr).map(square).toArray(); },
      underscore: function() { return _(arr).map(square); }
    });

    compareToUnderscore("filter", {
      lazy: function() { return Lazy(arr).filter(isEven).toArray(); },
      underscore: function() { return _(arr).filter(isEven); }
    });

    compareToUnderscore("map -> filter", {
      lazy: function() { return Lazy(arr).map(inc).filter(isEven).toArray(); },
      underscore: function() { return _.chain(arr).map(inc).filter(isEven).value(); }
    });

    compareToUnderscore("map -> map -> map", {
      lazy: function() { return Lazy(arr).map(inc).map(square).map(dec).toArray(); },
      underscore: function() { return _.chain(arr).map(inc).map(square).map(dec).value(); }
    });

    compareToUnderscore("map -> map -> map -> map -> map", {
      lazy: function() {
        return Lazy(arr)
          .map(inc).map(inc).map(inc).map(inc).map(inc)
          .toArray(); 
      },
      underscore: function() {
        return _.chain(arr)
          .map(inc).map(inc).map(inc).map(inc).map(inc)
          .value();
      }
    });

    compareToUnderscore("filter -> take", {
      lazy: function() { return Lazy(arr).filter(isEven).take(5).toArray(); },
      underscore: function() { return _.chain(arr).filter(isEven).first(5).value(); }
    });

    compareToUnderscore("filter -> drop -> take", {
      lazy: function() { return Lazy(arr).filter(isEven).drop(100).take(5).toArray(); },
      underscore: function() { return _.chain(arr).filter(isEven).rest(100).first(5).value(); }
    });
  });
});