using Microsoft.EntityFrameworkCore;
using UniBite.Api.Models;

namespace UniBite.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(UniBiteDbContext dbContext)
    {
        if (await dbContext.Campuses.AnyAsync())
        {
            return;
        }

        var campuses = BuildCampuses();
        await dbContext.Campuses.AddRangeAsync(campuses);
        await dbContext.SaveChangesAsync();

        var campusLookup = campuses.ToDictionary(campus => campus.Name, StringComparer.OrdinalIgnoreCase);

        var restaurants = BuildRestaurants(campusLookup);
        await dbContext.Restaurants.AddRangeAsync(restaurants);
        await dbContext.SaveChangesAsync();

        var ratings = BuildRatings(restaurants);
        await dbContext.Ratings.AddRangeAsync(ratings);
        await dbContext.SaveChangesAsync();
    }

    private static List<Campus> BuildCampuses() =>
    [
        new Campus
        {
            Name = "QUT Gardens Point",
            University = "Queensland University of Technology",
            Suburb = "Brisbane City",
            Latitude = -27.4778,
            Longitude = 153.0281
        },
        new Campus
        {
            Name = "QUT Kelvin Grove",
            University = "Queensland University of Technology",
            Suburb = "Kelvin Grove",
            Latitude = -27.4456,
            Longitude = 153.0134
        },
        new Campus
        {
            Name = "UQ St Lucia",
            University = "The University of Queensland",
            Suburb = "St Lucia",
            Latitude = -27.4975,
            Longitude = 153.0137
        },
        new Campus
        {
            Name = "Griffith South Bank",
            University = "Griffith University",
            Suburb = "South Brisbane",
            Latitude = -27.4811,
            Longitude = 153.0236
        },
        new Campus
        {
            Name = "Griffith Nathan",
            University = "Griffith University",
            Suburb = "Nathan",
            Latitude = -27.5551,
            Longitude = 153.0532
        }
    ];

    private static List<Restaurant> BuildRestaurants(IReadOnlyDictionary<string, Campus> campusLookup)
    {
        var baseDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var seedItems = new[]
        {
            new SeedRestaurant("QUT Gardens Point", "Riverfront Ramen", "117 Alice Street, Brisbane City", "Japanese", "$$", "Comfort Bowl", 0.4, -27.4786, 153.0297, "Creamy tonkotsu and late arvo karaage within an easy walk from lectures.", "https://example.com/riverfront-ramen"),
            new SeedRestaurant("QUT Gardens Point", "Botanic Bento", "70 George Street, Brisbane City", "Japanese", "$", "Quick Bite", 0.3, -27.4769, 153.0249, "Fast bento boxes that keep the queue moving between classes.", "https://example.com/botanic-bento"),
            new SeedRestaurant("QUT Gardens Point", "Lecture Break Tacos", "151 Margaret Street, Brisbane City", "Mexican", "$", "Social Lunch", 0.6, -27.4745, 153.0299, "Messy loaded tacos that work best with your project team.", "https://example.com/lecture-break-tacos"),
            new SeedRestaurant("QUT Gardens Point", "Night Owl Noodles", "45 Charlotte Street, Brisbane City", "Thai", "$", "Late Night", 0.8, -27.4714, 153.0274, "Open late for post-study noodle refuels and iced milk tea.", "https://example.com/night-owl-noodles"),
            new SeedRestaurant("QUT Gardens Point", "Capstone Cafe", "2 George Street, Brisbane City", "Cafe", "$", "Study Session", 0.2, -27.4781, 153.0267, "Quiet corners, strong coffee, and toasties that survive long assignment blocks.", "https://example.com/capstone-cafe"),
            new SeedRestaurant("QUT Gardens Point", "Bridgeview Grill", "198 Mary Street, Brisbane City", "Modern Australian", "$$$", "Date Night", 1.0, -27.4726, 153.0308, "A polished grill spot for celebrating studio reviews or semester wins.", "https://example.com/bridgeview-grill"),

            new SeedRestaurant("QUT Kelvin Grove", "Kelvin Green Curry", "51 Musk Avenue, Kelvin Grove", "Thai", "$$", "Comfort Bowl", 0.5, -27.4443, 153.0122, "Bright curries and wok-fried noodles that hit especially well on rainy days.", "https://example.com/kelvin-green-curry"),
            new SeedRestaurant("QUT Kelvin Grove", "Urban Grill Lab", "76 Musk Avenue, Kelvin Grove", "Burgers", "$$", "Cheat Day", 0.7, -27.4419, 153.0108, "Stacked burgers and loaded fries for maximum post-prac recovery.", "https://example.com/urban-grill-lab"),
            new SeedRestaurant("QUT Kelvin Grove", "Studio Sandwich Co", "1 Parkhurst Road, Kelvin Grove", "Sandwiches", "$", "Quick Bite", 0.2, -27.4463, 153.0146, "Fresh focaccias with zero fuss when you've got ten minutes to spare.", "https://example.com/studio-sandwich-co"),
            new SeedRestaurant("QUT Kelvin Grove", "Blackboard Bao", "405 Kelvin Grove Road, Kelvin Grove", "Chinese", "$", "Group Catch-up", 0.4, -27.4471, 153.0119, "Steamed bao, dumplings, and share plates that suit a whole tutorial crew.", "https://example.com/blackboard-bao"),
            new SeedRestaurant("QUT Kelvin Grove", "GVG Smoothie Bar", "149 Victoria Park Road, Kelvin Grove", "Healthy", "$", "Post Gym", 0.3, -27.4451, 153.0155, "Protein shakes, acai bowls, and wraps built for training days.", "https://example.com/gvg-smoothie-bar"),
            new SeedRestaurant("QUT Kelvin Grove", "After Class Pasta", "83 Blamey Street, Kelvin Grove", "Italian", "$$", "Date Night", 0.9, -27.4408, 153.0168, "Cozy pasta plates and tiramisu that feel fancier than the price suggests.", "https://example.com/after-class-pasta"),

            new SeedRestaurant("UQ St Lucia", "Lakeside Laksa", "235 Hawken Drive, St Lucia", "Malaysian", "$", "Comfort Bowl", 0.4, -27.4988, 153.0114, "A rich laksa stop that students swear by once deadlines start landing.", "https://example.com/lakeside-laksa"),
            new SeedRestaurant("UQ St Lucia", "Jacaranda Bites", "Union Road, St Lucia", "Cafe", "$", "Study Session", 0.2, -27.4971, 153.0125, "All-day breakfast, pastries, and enough outlets for laptop-heavy lunches.", "https://example.com/jacaranda-bites"),
            new SeedRestaurant("UQ St Lucia", "Toowong Taco Stop", "9 Sir Fred Schonell Drive, St Lucia", "Mexican", "$$", "Group Catch-up", 1.1, -27.5006, 153.0146, "Big burritos and crunchy chips that work well for club committee debriefs.", "https://example.com/toowong-taco-stop"),
            new SeedRestaurant("UQ St Lucia", "St Lucia Souvlaki", "33 Campbell Place, St Lucia", "Greek", "$$", "Hearty Meal", 0.8, -27.4953, 153.0158, "Chargrilled souvlaki wraps with enough substance to replace dinner.", "https://example.com/st-lucia-souvlaki"),
            new SeedRestaurant("UQ St Lucia", "Research Road Pizza", "88 Carmody Road, St Lucia", "Pizza", "$$", "Late Night", 1.2, -27.5023, 153.0126, "Late pizza slices and garlic knots for night labs and hackathons.", "https://example.com/research-road-pizza"),
            new SeedRestaurant("UQ St Lucia", "Market Day Dumplings", "Cnr Blair Drive and Union Road, St Lucia", "Chinese", "$", "Quick Bite", 0.5, -27.4964, 153.0097, "Steamed dumplings and chilli oil that make market days worth lingering for.", "https://example.com/market-day-dumplings"),

            new SeedRestaurant("Griffith South Bank", "Gallery Gyoza", "58 Tribune Street, South Brisbane", "Japanese", "$$", "Date Night", 0.3, -27.4804, 153.0243, "Crisp gyoza and sleek interiors suited to a pre-show dinner.", "https://example.com/gallery-gyoza"),
            new SeedRestaurant("Griffith South Bank", "Laneway Kebab Kitchen", "80 Grey Street, South Brisbane", "Middle Eastern", "$", "Quick Bite", 0.6, -27.4783, 153.0221, "Fast wraps loaded with charcoal meats and plenty of pickles.", "https://example.com/laneway-kebab-kitchen"),
            new SeedRestaurant("Griffith South Bank", "Espresso Ensemble", "Little Stanley Street, South Brisbane", "Cafe", "$", "Study Session", 0.1, -27.4818, 153.0234, "Reliable coffee and banana bread when you need a short reset between classes.", "https://example.com/espresso-ensemble"),
            new SeedRestaurant("Griffith South Bank", "South Bank Satay House", "194 Grey Street, South Brisbane", "Malaysian", "$$", "Group Catch-up", 0.7, -27.4839, 153.0208, "Satay platters and coconut rice for louder, longer lunch breaks.", "https://example.com/south-bank-satay-house"),
            new SeedRestaurant("Griffith South Bank", "Riverside Arepas", "167 Stanley Street, South Brisbane", "Latin American", "$$", "Adventurous", 0.9, -27.4847, 153.0242, "Crunchy arepas and zesty sauces for when you want something different.", "https://example.com/riverside-arepas"),
            new SeedRestaurant("Griffith South Bank", "Curtain Call Crepes", "32 Glenelg Street, South Brisbane", "Dessert", "$", "Sweet Treat", 0.4, -27.4826, 153.0213, "Sweet and savoury crepes that double as a fast lunch or a post-class reward.", "https://example.com/curtain-call-crepes"),

            new SeedRestaurant("Griffith Nathan", "Bushland Burrito", "170 Kessels Road, Nathan", "Mexican", "$", "Quick Bite", 0.7, -27.5524, 153.0516, "Portable burritos that work well when your next class is uphill.", "https://example.com/bushland-burrito"),
            new SeedRestaurant("Griffith Nathan", "Nathan Nasi Corner", "176 Messines Ridge Road, Nathan", "Malaysian", "$", "Comfort Bowl", 0.5, -27.5538, 153.0545, "Nasi lemak and spicy sambal with generous student-friendly portions.", "https://example.com/nathan-nasi-corner"),
            new SeedRestaurant("Griffith Nathan", "Campus Katsu Club", "34 Griffith Road, Nathan", "Japanese", "$$", "Hearty Meal", 0.6, -27.5561, 153.0526, "Crunchy katsu sets and curry trays for serious hunger.", "https://example.com/campus-katsu-club"),
            new SeedRestaurant("Griffith Nathan", "Forest Flame Pizza", "209 Kessels Road, Nathan", "Pizza", "$$", "Group Catch-up", 1.0, -27.5584, 153.0567, "Shareable woodfired pizzas that make club nights easier to plan.", "https://example.com/forest-flame-pizza"),
            new SeedRestaurant("Griffith Nathan", "Hopper House", "147 Toohey Road, Nathan", "Sri Lankan", "$$", "Adventurous", 1.1, -27.5603, 153.0511, "String hoppers, curries, and spice levels that reward brave orders.", "https://example.com/hopper-house"),
            new SeedRestaurant("Griffith Nathan", "Eco Eats Deli", "Parklands Drive, Nathan", "Healthy", "$", "Post Gym", 0.3, -27.5541, 153.0534, "Fresh salads, wraps, and cold brew for low-effort healthy lunches.", "https://example.com/eco-eats-deli")
        };

        return seedItems
            .Select((item, index) => new Restaurant
            {
                CampusId = campusLookup[item.CampusName].Id,
                Name = item.Name,
                Address = item.Address,
                Cuisine = item.Cuisine,
                Budget = item.Budget,
                Mood = item.Mood,
                DistanceFromCampusKm = item.DistanceFromCampusKm,
                Latitude = item.Latitude,
                Longitude = item.Longitude,
                Description = item.Description,
                WebsiteUrl = item.WebsiteUrl,
                CreatedAtUtc = baseDate.AddDays(index),
                IsApproved = true
            })
            .ToList();
    }

    private static List<Rating> BuildRatings(IReadOnlyList<Restaurant> restaurants)
    {
        var reviewerNames = new[]
        {
            "Ava",
            "Luca",
            "Mia",
            "Noah",
            "Sienna",
            "Ethan",
            "Zara",
            "Kai",
            "Ruby",
            "Leo"
        };

        var positiveComments = new[]
        {
            "Fast service and the portion size is perfect between classes.",
            "Would absolutely come back after a long tutorial block.",
            "The flavour balance is strong and the staff are lovely.",
            "One of the easiest picks when our group cannot decide.",
            "Great value without feeling like a compromise.",
            "Consistently good and usually worth the short queue."
        };

        var constructiveComments = new[]
        {
            "Really tasty, although the lunch rush can slow things down.",
            "Good food overall, but I would love slightly bigger portions.",
            "Worth the walk, especially if you avoid peak time.",
            "Solid choice, even if the seating fills up quickly."
        };

        var createdAt = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc);
        var ratings = new List<Rating>();

        foreach (var (restaurant, index) in restaurants.Select((restaurant, index) => (restaurant, index)))
        {
            ratings.Add(new Rating
            {
                RestaurantId = restaurant.Id,
                ReviewerName = reviewerNames[index % reviewerNames.Length],
                Score = 4 + (index % 2),
                Comment = positiveComments[index % positiveComments.Length],
                CreatedAtUtc = createdAt.AddDays(index)
            });

            if (index % 3 == 0)
            {
                continue;
            }

            ratings.Add(new Rating
            {
                RestaurantId = restaurant.Id,
                ReviewerName = reviewerNames[(index + 3) % reviewerNames.Length],
                Score = 3 + (index % 3),
                Comment = constructiveComments[index % constructiveComments.Length],
                CreatedAtUtc = createdAt.AddDays(index).AddHours(6)
            });
        }

        return ratings;
    }

    private sealed record SeedRestaurant(
        string CampusName,
        string Name,
        string Address,
        string Cuisine,
        string Budget,
        string Mood,
        double DistanceFromCampusKm,
        double Latitude,
        double Longitude,
        string Description,
        string WebsiteUrl);
}
