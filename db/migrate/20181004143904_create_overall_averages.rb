class CreateOverallAverages < ActiveRecord::Migration[5.1]

  def up
    create_table :overall_averages do |t|
      t.belongs_to :rateable, :polymorphic => true
      t.float :overall_avg, :null => false
      t.timestamps
    end
  end

  def down
    drop_table :overall_averages
  end

end

