# Welcome to the Petiatrics Git!

## Expo

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

### Getting started

1. Install dependencies

   ```
   npm install
   ```

2. Start the app

   ```
   npm start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).


## SQLite with Drizzle

The app uses an SQLite database. 

You can find the schema in **/db/schema.ts**

**/db/medData.ts** holds the pre-defined medications, side effects, pet information, and a demo user

Here's some [helpful documentation](https://orm.drizzle.team/docs/get-started-sqlite) along with this [article](https://expo.dev/blog/modern-sqlite-for-react-native-apps) and its accompanying [Youtube video](https://www.youtube.com/watch?v=AT5asDD3u_A).


## Animations

The animations were made using [Piskel](https://www.piskelapp.com/).

Piskel Files can be found in **/assets/Piskel Files**. These files hold the animation slides and some assets.
- For background assets, the easiest way to get them is to crop the drawing board to the size of the asset, then export it as a png at 6x the size.
- For the pets, they're exported as spritesheets at 8x the resolution. The animation component handles a row of sprites, so make the number of columns the same as the number of layers.

assets/images/Containers holds the background container squares and rectangles.
You can also find the tab images in assets/images/Tabs.

Cat assets can be found in **/app/petPageItems**:
- **/catIcons** has the cat faces for the breed selection screen
- **/hatIcons** has the cat hats for the hat selection screen
- **/spritesheets** has the cat animation sheets
- **/spritesheets/hats** has the hat animation sheets
 - "**birthdaySprite**" corresponds to the empty sprite for no hat


## Layout Overview

### Tabs
The app uses a tab system, which can be found in **/app/(tabs)**

- **/_layout.tsx** controls the order of the tabs
- **/gamesPage.tsx** is the base page for the game selection
- **/index.tsx** is the main hope page the app opens to
- **/infoPage.tsx** is the patient medication page
- **/petPage.tsx** is the pet selection page
- **/settingsPage.tsx** is the settings page

*Ignore errors like `Parameter 'spriteImg' implicitly has an 'any' type.`, the app still works* 

### Other Pages
Other pages are stored in the folders corresponding to their base page name.

**/app/gamesPageItems** has the two games we created
**/app/infoPageItems** has the provider and detailed medication views
- **/\[id\].tsx** renders based on the selected medication
- **/medicationSelection.tsx** is the provider view for adding and removing medications
- The modals for each medication scenario are also in this folder
**/app/petPageItems** has the cat assets and components
- **/animationSequences** has the custom animation sequences based on the spritesheets
- **/catAnimation.js** has the custom sprite sheet components
- **/catIconButtons.js** is the component for the cat icons
- **/hatIconButtons.js** is the component for the hat icons


## Professor and Student suggestions
- making a separate login for the provider to manage all patients 
- creating notifications for their medication times
- adding a notes section to the input/medication info page
- create more trivia-based games
- login system for patients

If you have any questions feel free to reach out to aea.duffey@gmail.com



