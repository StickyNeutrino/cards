#!/usr/bin/env python3

import os
import json
import re

def get_card_images(directory="."):
    """
    Gets a JSON list of all PNG card filenames in a directory,
    renamed to front and back according to naming conventions specified in the script.

    Args:
        directory (str, optional): The directory to search in. Defaults to ".".

    Returns:
        str: A JSON string representing a list of card objects.
    """

    card_list = []
    front_pattern = re.compile(r"(.*) Front\.jpg")
    back_pattern = re.compile(r"(.*) Back\.jpg")

    #Dictionary to store names with Front already created to avoid name conflicts
    front_card_names = {}

    for filename in os.listdir(directory):
        if filename.endswith(".jpg"):
            front_match = front_pattern.match(filename)

            if front_match:
                card_name = front_match.group(1)
                front_card_names[card_name] = True
                card_list.append({"name": card_name, "front": filename, "back": None})

    for filename in os.listdir(directory):
        if filename.endswith(".jpg"):
            back_match = back_pattern.match(filename)
            if back_match:
                card_name = back_match.group(1)
                card_list_pos = -1
                for i in range(len(card_list)):
                    if (card_list[i]["name"] == card_name):
                        card_list_pos = i;
                        break;
                if (card_list_pos != -1):
                     card_list[card_list_pos]["back"] = filename
                elif card_name in front_card_names:
                    #This is a case where the Front image was created and the process was interrupted before the back was
                    #In this case it should be a complete card set
                    print("Warning: Front card already exists but there is no card info for this one")
                else:
                    card_list.append({"name": card_name, "front": None, "back": filename})

    # Check to make sure each card front exists and is paired with a back
    for card in card_list:
        if card["front"] == None:
            print(f'Warning: card has no front found: {card}')
        if card["back"] == None:
            print(f'Warning: card has no back found: {card}')

    return json.dumps(card_list, indent=4)


if __name__ == "__main__":
    #Example usage
    json_output = get_card_images()
    print(json_output)

    #Optional: Save to a file
    #with open("cards.json", "w") as outfile:
    #    outfile.write(json_output)
