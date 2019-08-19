class CreateEvents < ActiveRecord::Migration[5.1]
  def change
    create_table :events do |t|
      t.references :store, foreign_key: true
      t.references :user, foreign_key: true
      t.integer :priority
      t.string :name
      t.integer :category
      t.boolean :active
      t.text :description
      t.datetime :start_datetime
      t.datetime :end_datetime
      t.string :video_link
      t.string :address
      t.string :latitude
      t.string :longitude

      t.timestamps
    end
  end
end
