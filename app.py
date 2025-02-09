from flask import Flask, request, jsonify,render_template,redirect, url_for

import os
import pymysql  # For MySQL connection (you can replace it with your ORM/library)


# Create Flask's `app` object
app = Flask(__name__, static_folder='static',template_folder="static/templates")

# Configure the upload folder
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


#default Route
@app.route("/")
def hello():
    return render_template('index.html')

# Route to upload clothing information
@app.route('/upload_clothing', methods=['POST'])
def upload_clothing():
    # Parse form data
    clothing_data = request.form.to_dict()
    image_file = request.files.get('image')

    # Save the image file, if provided
    image_path = None
    if image_file:
        image_filename = (image_file.filename)  # Secure the filename
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        image_file.save(image_path)

    # Ensure LastWorn is converted properly (if provided)
    from datetime import datetime
    last_worn_date = None
    if clothing_data.get('LastWorn'):
        last_worn_date = datetime.strptime(clothing_data.get('LastWorn'), '%Y-%m-%d').date()

    # Database connection and query execution
    connection = pymysql.connect(
        host="",                # Your database host
        user="clothingApp",            # Your database username
        password="",        # Your database password
        database="ClothingApp",   # Your database name
    )
    cursor = connection.cursor()

    # SQL query to insert clothing data into the database
    sql = """
        INSERT INTO Clothing (
            Name, Type, Brand, Size, PrimaryColor, AccentColors, Pattern, Material,
            Occasion, Season, FormalityLevel, LayeringPotential, StyleKeywords,
            State, CareInstructions, Versatility, LastWorn, ImagePath
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    # Execute the query with provided data
    cursor.execute(sql, (
        clothing_data.get('Name'),
        clothing_data.get('Type'),
        clothing_data.get('Brand'),
        clothing_data.get('Size'),
        clothing_data.get('PrimaryColor'),
        clothing_data.get('AccentColors'),
        clothing_data.get('Pattern'),
        clothing_data.get('Material'),
        clothing_data.get('Occasion'),
        clothing_data.get('Season'),
        clothing_data.get('FormalityLevel'),
        clothing_data.get('LayeringPotential'),
        clothing_data.get('StyleKeywords'),
        clothing_data.get('State'),
        clothing_data.get('CareInstructions'),
        clothing_data.get('Versatility'),
        last_worn_date,
        image_path
    ))
    connection.commit()

    # Close connection
    cursor.close()
    connection.close()

    return jsonify({"message": "Clothing item uploaded successfully!"}), 201

# Route to serve the HTML page
@app.route("/upload_page")
def upload_page():
    return render_template('uploadPage.html')

@app.route('/view_clothing')
def view_clothing():
    # Database connection
    connection = pymysql.connect(host=env.HOST, user=env.USER, password=env.PASSWORD, db=env.DATABASE)
    cursor = connection.cursor()

    cursor.execute("SELECT Name, Type, Brand, ImagePath, PrimaryColor, StyleKeywords, Size, AccentColors, Pattern, Material, Occasion, Season, FormalityLevel, LayeringPotential, State, CareInstructions, Versatility, LastWorn FROM Clothing")
    clothes = cursor.fetchall()

    # Extract unique filter values
    unique_types = set(item[1] for item in clothes)
    unique_colors = set(item[4] for item in clothes)
    unique_styles = set(item[5] for item in clothes)
    unique_brands = set(item[2] for item in clothes)
    unique_sizes = set(item[6] for item in clothes)

    cursor.close()
    connection.close()

    return render_template('view_clothing.html', clothes=clothes, 
                           unique_types=unique_types, 
                           unique_colors=unique_colors, 
                           unique_styles=unique_styles,
                           unique_brands=unique_brands,
                           unique_sizes=unique_sizes
                           )
    

if __name__ == "__main__":
    app.run(debug=1)
